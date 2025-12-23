import numpy_financial as npf
import math
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
    annual_production_mwh: float
    tariff_php_per_kwh: float
    annual_opex: float
    tax_rate: float
    interest_rate: float
    debt_share: float  # 0.0 to 1.0
    project_duration_years: int


@app.post("/calculate-model")
def run_financial_model(inputs: ProjectInputs):
    # Calculate total CAPEX
    total_capex = inputs.hard_costs + inputs.soft_costs
    
    # Calculate annual production in kWh
    annual_production_kwh = inputs.annual_production_mwh * 1000
    
    # Calculate annual revenue from tariff
    annual_revenue = annual_production_kwh * inputs.tariff_php_per_kwh
    
    # Calculate annual interest
    annual_interest = (total_capex * inputs.debt_share) * inputs.interest_rate
    
    # Calculate taxable income (if < 0, tax is 0)
    taxable_income = annual_revenue - inputs.annual_opex - annual_interest
    if taxable_income < 0:
        annual_tax = 0.0
    else:
        annual_tax = taxable_income * inputs.tax_rate
    
    # Calculate annual net profit
    annual_net_profit = annual_revenue - inputs.annual_opex - annual_interest - annual_tax
    
    # Calculate total equity
    total_equity = total_capex * (1 - inputs.debt_share)
    
    # Calculate LCOE per kWh (Excel style)
    lifetime_production_mwh = inputs.annual_production_mwh * inputs.project_duration_years
    lifetime_production_kwh = lifetime_production_mwh * 1000
    total_lifetime_cost = total_capex + (inputs.annual_opex * inputs.project_duration_years)
    
    if lifetime_production_kwh == 0:
        lcoe_kwh = 0.0
    else:
        lcoe_kwh = total_lifetime_cost / lifetime_production_kwh
    
    # Calculate ROI_years (Project Payback Period)
    if annual_net_profit <= 0:
        roi_years = 999.0
    else:
        roi_years = total_capex / annual_net_profit
    
    # Calculate ROE_years (Equity Payback Period)
    if annual_net_profit <= 0:
        roe_years = 999.0
    else:
        roe_years = total_equity / annual_net_profit
    
    # Return JSON with all inputs plus calculated values
    return {
        "hard_costs": round(inputs.hard_costs, 2),
        "soft_costs": round(inputs.soft_costs, 2),
        "annual_production_mwh": round(inputs.annual_production_mwh, 2),
        "tariff_php_per_kwh": round(inputs.tariff_php_per_kwh, 4),
        "annual_revenue": round(annual_revenue, 2),
        "annual_opex": round(inputs.annual_opex, 2),
        "tax_rate": round(inputs.tax_rate, 4),
        "interest_rate": round(inputs.interest_rate, 4),
        "debt_share": round(inputs.debt_share, 4),
        "project_duration_years": inputs.project_duration_years,
        "total_capex": round(total_capex, 2),
        "total_equity": round(total_equity, 2),
        "annual_interest": round(annual_interest, 2),
        "annual_tax": round(annual_tax, 2),
        "annual_net_profit": round(annual_net_profit, 2),
        "LCOE_kwh": round(lcoe_kwh, 2),
        "ROI_years": round(roi_years, 2),
        "ROE_years": round(roe_years, 2)
    }
