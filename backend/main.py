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
    capacity_hydro_mw: float = 0.0  # Baseload
    capacity_diesel_mw: float = 0.0  # Peaking
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
    solar_yield = 1450  # kWh/kWp/year (~16.5% CF)
    hydro_cf = 0.60     # Hydro: 60% CF → 8760 * 0.60 kWh/kW/year
    diesel_cf = 0.15    # Diesel: 15% CF → 8760 * 0.15 kWh/kW/year
    degradation_rate = 0.005  # 0.5% per year
    inflation_rate = 0.03     # 3% per year

    # Year 1 production (MWh)
    solar_gen = inputs.capacity_solar_mw * 1450  # MWh/year (MW * 1450)
    hydro_gen = inputs.capacity_hydro_mw * 8760 * hydro_cf  # kWh/year
    diesel_gen = inputs.capacity_diesel_mw * 8760 * diesel_cf  # kWh/year

    # Convert hydro & diesel kWh to MWh
    yr1_production_solar = solar_gen  # MWh/year
    yr1_production_hydro = hydro_gen / 1000.0
    yr1_production_diesel = diesel_gen / 1000.0

    total_yr1_production_mwh = (
        yr1_production_solar + yr1_production_hydro + yr1_production_diesel
    )

    # Total CAPEX, equity, and debt
    total_capex = inputs.hard_costs + inputs.soft_costs
    total_equity = total_capex * (1 - inputs.debt_share)
    total_debt = total_capex * inputs.debt_share

    # Debt amortization (mortgage-style)
    r = inputs.interest_rate
    n = inputs.project_duration_years
    if n <= 0:
        annual_debt_service = 0.0
    else:
        if r > 0:
            factor = (1 + r) ** n
            annual_debt_service = total_debt * (r * factor) / (factor - 1) if factor != 1 else 0.0
        else:
            annual_debt_service = total_debt / n

    remaining_debt = total_debt

    # Aggregations for LCOE and payback
    lifetime_production_mwh = 0.0
    lifetime_opex = 0.0

    # Waterfall / cash flow tracking
    running_cash = -total_capex  # project-level payback
    project_payback_year = 999

    # DSCR tracking
    dscr_list = []

    # Year 1 summary metrics for charting
    annual_revenue_year1 = 0.0
    annual_net_profit_year1 = 0.0

    # Yearly breakdown lists
    years = []
    gen_mwh_list = []
    revenue_list = []
    opex_list = []
    debt_service_list = []
    principal_list = []
    interest_list = []
    net_profit_list = []
    dscr_year_list = []
    cumulative_cash_list = []

    for year in range(1, inputs.project_duration_years + 1):
        # Degradation on production
        degradation_factor = (1 - degradation_rate) ** (year - 1)
        current_production_mwh = total_yr1_production_mwh * degradation_factor
        current_production_kwh = current_production_mwh * 1000

        # Revenue and Opex with inflation
        current_revenue = current_production_kwh * inputs.tariff_php_per_kwh
        current_opex = inputs.annual_opex * ((1 + inflation_rate) ** (year - 1))

        # Debt amortization
        if remaining_debt > 0 and annual_debt_service > 0:
            interest_payment = remaining_debt * r
            # Protect against negative principal in very late years
            principal_payment = max(annual_debt_service - interest_payment, 0.0)
            if principal_payment > remaining_debt:
                principal_payment = remaining_debt
            debt_service = interest_payment + principal_payment
            remaining_debt = max(remaining_debt - principal_payment, 0.0)
        else:
            interest_payment = 0.0
            principal_payment = 0.0
            debt_service = 0.0

        # Tax & profit (simple cash tax, no depreciation)
        taxable_income = current_revenue - current_opex - interest_payment
        tax = taxable_income * inputs.tax_rate if taxable_income > 0 else 0.0
        net_profit = taxable_income - tax

        # CFADS and DSCR
        cfads = current_revenue - current_opex  # Cash Flow Available for Debt Service
        if annual_debt_service > 0:
            dscr = cfads / annual_debt_service
        else:
            dscr = 0.0

        # Running cash (equity-like payback after debt service and tax)
        free_cash_after_debt = current_revenue - current_opex - tax - debt_service
        running_cash += free_cash_after_debt
        if running_cash > 0 and project_payback_year == 999:
            project_payback_year = year

        # Aggregations for LCOE
        lifetime_production_mwh += current_production_mwh
        lifetime_opex += current_opex

        # Capture year 1 metrics for summary
        if year == 1:
            annual_revenue_year1 = current_revenue
            annual_net_profit_year1 = net_profit

        # Store yearly breakdown
        years.append(year)
        gen_mwh_list.append(current_production_mwh)
        revenue_list.append(current_revenue)
        opex_list.append(current_opex)
        debt_service_list.append(debt_service)
        principal_list.append(principal_payment)
        interest_list.append(interest_payment)
        net_profit_list.append(net_profit)
        dscr_year_list.append(dscr)
        cumulative_cash_list.append(running_cash)

        if dscr > 0:
            dscr_list.append(dscr)

    total_lifetime_cost = total_capex + lifetime_opex
    if lifetime_production_mwh > 0:
        lcoe = total_lifetime_cost / lifetime_production_mwh
    else:
        lcoe = 0.0

    # ROI/ROE years as payback proxies
    roi_years = project_payback_year
    # For ROE_years, approximate using same project payback for now (can refine later)
    roe_years = project_payback_year

    avg_dscr = sum(dscr_list) / len(dscr_list) if dscr_list else 0.0

    yearly_breakdown = {
        "years": years,
        "generation_mwh": [round(v, 2) for v in gen_mwh_list],
        "revenue": [round(v, 2) for v in revenue_list],
        "opex": [round(v, 2) for v in opex_list],
        "debt_service": [round(v, 2) for v in debt_service_list],
        "principal_payment": [round(v, 2) for v in principal_list],
        "interest_payment": [round(v, 2) for v in interest_list],
        "net_profit": [round(v, 2) for v in net_profit_list],
        "dscr": [round(v, 3) for v in dscr_year_list],
        "cumulative_cash": [round(v, 2) for v in cumulative_cash_list],
    }

    return {
        "hard_costs": round(inputs.hard_costs, 2),
        "soft_costs": round(inputs.soft_costs, 2),
        "capacity_solar_mw": round(inputs.capacity_solar_mw, 3),
        "capacity_hydro_mw": round(inputs.capacity_hydro_mw, 3),
        "capacity_diesel_mw": round(inputs.capacity_diesel_mw, 3),
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
        "generated_hydro_mwh": round(yr1_production_hydro, 2),
        "generated_diesel_mwh": round(yr1_production_diesel, 2),
        "total_production_mwh": round(total_yr1_production_mwh, 2),
        "LCOE_kwh": round(lcoe / 1000, 4) if lifetime_production_mwh > 0 else 0.0,  # convert to per kWh
        "LCOE": round(lcoe, 2),  # retain per MWh if needed
        "ROI_years": roi_years,
        "ROE_years": roe_years,
        "project_payback_year": project_payback_year,
        "equity_payback_year": project_payback_year,
        "avg_dscr": round(avg_dscr, 2),
        "yearly_breakdown": yearly_breakdown,
    }
