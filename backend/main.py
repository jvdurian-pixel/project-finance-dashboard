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
    annual_revenue: float
    annual_opex: float
    tax_rate: float
    interest_rate: float
    debt_share: float  # 0.0 to 1.0
    project_duration_years: int


@app.post("/calculate-model")
def run_financial_model(inputs: ProjectInputs):
    # Calculate total CAPEX
    total_capex = inputs.hard_costs + inputs.soft_costs
    
    # Calculate annual interest
    annual_interest = (total_capex * inputs.debt_share) * inputs.interest_rate
    
    # Calculate taxable income (if < 0, tax is 0)
    taxable_income = inputs.annual_revenue - inputs.annual_opex - annual_interest
    if taxable_income < 0:
        annual_tax = 0.0
    else:
        annual_tax = taxable_income * inputs.tax_rate
    
    # Calculate annual net profit
    annual_net_profit = inputs.annual_revenue - inputs.annual_opex - annual_interest - annual_tax
    
    # Calculate ROI (Total Net Profit / Total Capex) * 100
    total_net_profit = annual_net_profit * inputs.project_duration_years
    roi = ((total_net_profit / total_capex) * 100) if total_capex > 0 else 0.0
    
    # Calculate ROE (Net Profit / (Capex * (1 - Debt_Share))) * 100
    equity = total_capex * (1 - inputs.debt_share)
    roe = ((annual_net_profit / equity) * 100) if equity > 0 else 0.0
    
    # Calculate LCOE with safety logic
    lifetime_production = inputs.annual_production_mwh * inputs.project_duration_years
    if lifetime_production == 0:
        lcoe = 0.0
    else:
        total_lifetime_cost = total_capex + (inputs.annual_opex * inputs.project_duration_years)
        lcoe = total_lifetime_cost / lifetime_production
    
    # Return JSON with all inputs plus calculated values
    return {
        "hard_costs": round(inputs.hard_costs, 2),
        "soft_costs": round(inputs.soft_costs, 2),
        "annual_production_mwh": round(inputs.annual_production_mwh, 2),
        "annual_revenue": round(inputs.annual_revenue, 2),
        "annual_opex": round(inputs.annual_opex, 2),
        "tax_rate": round(inputs.tax_rate, 4),
        "interest_rate": round(inputs.interest_rate, 4),
        "debt_share": round(inputs.debt_share, 4),
        "project_duration_years": inputs.project_duration_years,
        "total_capex": round(total_capex, 2),
        "annual_interest": round(annual_interest, 2),
        "annual_tax": round(annual_tax, 2),
        "annual_net_profit": round(annual_net_profit, 2),
        "LCOE": round(lcoe, 2),
        "ROI": round(roi, 2),
        "ROE": round(roe, 2)
    }
