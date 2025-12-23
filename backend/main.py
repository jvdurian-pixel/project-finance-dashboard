from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProjectInputs(BaseModel):
    hard_costs: float
    soft_costs: float
    capacity_solar_mw: float = 0.0
    capacity_wind_mw: float = 0.0
    capacity_bess_mwh: float = 0.0
    tariff_php_per_kwh: float
    annual_opex: float
    tax_rate: float
    interest_rate: float
    debt_share: float  # 0.0 to 1.0
    project_duration_years: int


@app.post("/calculate-model")
def run_financial_model(inputs: ProjectInputs):
    # Constants (physics & financial assumptions)
    solar_yield = 1450  # kWh/kWp/year
    wind_yield = 2900   # kWh/kW/year
    degradation_rate = 0.005  # 0.5% per year
    opex_inflation = 0.03     # 3% per year

    # Year 1 production (MWh)
    yr1_production_solar = inputs.capacity_solar_mw * 1000 * (solar_yield / 1000)
    yr1_production_wind = inputs.capacity_wind_mw * 1000 * (wind_yield / 1000)
    total_yr1_production_mwh = yr1_production_solar + yr1_production_wind

    # Total CAPEX and equity
    total_capex = inputs.hard_costs + inputs.soft_costs
    total_equity = total_capex * (1 - inputs.debt_share)
    annual_interest_base = (total_capex * inputs.debt_share) * inputs.interest_rate

    # Loop over project years for cash flows
    lifetime_production_mwh = 0.0
    lifetime_opex = 0.0
    cumulative_cash_flow = -total_capex
    project_payback_year = 999
    equity_payback_year = 999

    annual_revenue_year1 = 0.0
    annual_net_profit_year1 = 0.0

    equity_cumulative = -total_equity

    for year in range(1, inputs.project_duration_years + 1):
        degradation_factor = (1 - degradation_rate) ** (year - 1)
        yearly_production_mwh = total_yr1_production_mwh * degradation_factor
        yearly_production_kwh = yearly_production_mwh * 1000
        yearly_revenue = yearly_production_kwh * inputs.tariff_php_per_kwh

        yearly_opex = inputs.annual_opex * ((1 + opex_inflation) ** (year - 1))
        # Assume interest on debt is constant simple interest each year
        yearly_interest = annual_interest_base

        taxable_income = yearly_revenue - yearly_opex - yearly_interest
        yearly_tax = taxable_income * inputs.tax_rate if taxable_income > 0 else 0.0
        yearly_net_profit = yearly_revenue - yearly_opex - yearly_interest - yearly_tax

        # Capture year 1 metrics for charting
        if year == 1:
            annual_revenue_year1 = yearly_revenue
            annual_net_profit_year1 = yearly_net_profit

        # Aggregations
        lifetime_production_mwh += yearly_production_mwh
        lifetime_opex += yearly_opex

        cumulative_cash_flow += yearly_net_profit
        if cumulative_cash_flow > 0 and project_payback_year == 999:
            project_payback_year = year

        equity_cumulative += yearly_net_profit
        if equity_cumulative > 0 and equity_payback_year == 999:
            equity_payback_year = year

    total_lifetime_cost = total_capex + lifetime_opex
    if lifetime_production_mwh > 0:
        lcoe = total_lifetime_cost / lifetime_production_mwh
    else:
        lcoe = 0.0

    # ROI/ROE years as payback proxies
    roi_years = project_payback_year
    roe_years = equity_payback_year

    return {
        "hard_costs": round(inputs.hard_costs, 2),
        "soft_costs": round(inputs.soft_costs, 2),
        "capacity_solar_mw": round(inputs.capacity_solar_mw, 3),
        "capacity_wind_mw": round(inputs.capacity_wind_mw, 3),
        "capacity_bess_mwh": round(inputs.capacity_bess_mwh, 3),
        "tariff_php_per_kwh": round(inputs.tariff_php_per_kwh, 4),
        "annual_opex": round(inputs.annual_opex, 2),
        "tax_rate": round(inputs.tax_rate, 4),
        "interest_rate": round(inputs.interest_rate, 4),
        "debt_share": round(inputs.debt_share, 4),
        "project_duration_years": inputs.project_duration_years,
        "total_capex": round(total_capex, 2),
        "total_equity": round(total_equity, 2),
        "annual_revenue": round(annual_revenue_year1, 2),
        "annual_net_profit": round(annual_net_profit_year1, 2),
        "generated_solar_mwh": round(yr1_production_solar, 2),
        "generated_wind_mwh": round(yr1_production_wind, 2),
        "total_production_mwh": round(total_yr1_production_mwh, 2),
        "LCOE_kwh": round(lcoe / 1000, 4) if lifetime_production_mwh > 0 else 0.0,  # convert to per kWh
        "LCOE": round(lcoe, 2),  # retain per MWh if needed
        "ROI_years": roi_years,
        "ROE_years": roe_years,
        "project_payback_year": project_payback_year,
        "equity_payback_year": equity_payback_year
    }
