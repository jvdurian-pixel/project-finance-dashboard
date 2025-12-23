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


class ModelInputs(BaseModel):
    # Macro
    forex_rate: float = 58.0
    forex_escalation: float = 0.02
    local_inflation: float = 0.04
    
    # Revenue
    tariff_php: float = 8.50
    generation_kwh: float = 1000000
    degradation_rate: float = 0.005
    
    # Capex
    capex_usd: float = 1500000
    capex_forex_exposure: float = 0.70
    
    # Opex
    fuel_cost_usd_liter: float = 0.90
    fuel_efficiency: float = 3.8
    variable_opex_php: float = 1.50
    
    # Debt
    debt_ratio: float = 0.70
    interest_rate: float = 0.08
    tenor_years: int = 15
    
    # Tax (standard for project finance)
    tax_rate: float = 0.25


@app.post("/calculate-model")
def run_financial_model(inputs: ModelInputs):
    project_years = 30
    
    # Calculate total CAPEX in PHP
    capex_local_php = inputs.capex_usd * inputs.capex_forex_exposure * inputs.forex_rate
    capex_usd_portion = inputs.capex_usd * (1 - inputs.capex_forex_exposure)
    capex_total_php = capex_local_php + (capex_usd_portion * inputs.forex_rate)
    
    # Calculate debt amount
    debt_amount = capex_total_php * inputs.debt_ratio
    
    # Calculate annual debt service payment
    if debt_amount > 0 and inputs.tenor_years > 0:
        # Use PMT formula: PMT = PV * r * (1 + r)^n / ((1 + r)^n - 1)
        r = inputs.interest_rate
        n = inputs.tenor_years
        if r > 0:
            debt_payment = debt_amount * (r * (1 + r)**n) / ((1 + r)**n - 1)
        else:
            debt_payment = debt_amount / n
    else:
        debt_payment = 0.0
    
    # Initialize data structures
    annual_data = []
    free_cash_flows = [-capex_total_php]  # Year 0: initial investment
    dscr_values = []
    roe_values = []
    total_net_profit = 0.0
    
    # Calculation loop for 30 years
    for year in range(1, project_years + 1):
        year_index = year - 1  # 0-indexed for formulas
        
        # Degradation
        current_generation = inputs.generation_kwh * ((1 - inputs.degradation_rate) ** year_index)
        
        # Inflation
        current_opex_php = inputs.variable_opex_php * ((1 + inputs.local_inflation) ** year_index)
        
        # Forex
        current_forex = inputs.forex_rate * ((1 + inputs.forex_escalation) ** year_index)
        
        # Fuel Logic
        fuel_cost_php = (inputs.fuel_cost_usd_liter * current_forex) / inputs.fuel_efficiency
        total_fuel_cost = fuel_cost_php * current_generation
        
        # Revenue
        revenue = inputs.tariff_php * current_generation
        
        # Opex
        variable_opex_total = current_opex_php * current_generation
        total_opex = variable_opex_total + total_fuel_cost
        
        # EBITDA
        ebitda = revenue - total_opex
        
        # Tax
        tax = ebitda * inputs.tax_rate if ebitda > 0 else 0
        
        # Debt Service (only during tenor period)
        current_debt_payment = debt_payment if year <= inputs.tenor_years else 0.0
        
        # Calculate Net Profit (Revenue - Opex - Tax - Interest Payment)
        # Note: Using debt_payment as interest payment (includes principal + interest)
        annual_net_profit = revenue - total_opex - tax - current_debt_payment
        
        # Calculate ROE (Net Profit / Equity)
        # Equity = Capex * (1 - Debt_Share)
        equity = capex_total_php * (1 - inputs.debt_ratio)
        annual_roe = (annual_net_profit / equity) if equity > 0 else 0.0
        
        # Accumulate total net profit for global ROI
        total_net_profit += annual_net_profit
        
        # Free Cash Flow
        free_cash_flow = ebitda - tax - current_debt_payment
        
        # DSCR Calculation (Debt Service Coverage Ratio)
        if current_debt_payment > 0:
            dscr = (ebitda - tax) / current_debt_payment
        else:
            dscr = 100.0  # Safe Infinity
        
        dscr_values.append(dscr)
        roe_values.append(annual_roe)
        free_cash_flows.append(free_cash_flow)
        
        # Store annual data
        annual_data.append({
            "Year": year,
            "Generation_kWh": round(current_generation, 2),
            "Forex_Rate": round(current_forex, 4),
            "Revenue": round(revenue, 2),
            "Variable_Opex": round(variable_opex_total, 2),
            "Fuel_Cost": round(total_fuel_cost, 2),
            "Total_Opex": round(total_opex, 2),
            "EBITDA": round(ebitda, 2),
            "Tax": round(tax, 2),
            "Debt_Payment": round(current_debt_payment, 2),
            "Net_Profit": round(annual_net_profit, 2),
            "ROE": round(annual_roe, 4),
            "Free_Cash_Flow": round(free_cash_flow, 2),
            "DSCR": round(dscr, 2)
        })
    
    # Calculate summary metrics with safety logic
    
    # NPV Calculation (10% discount rate)
    discount_rate = 0.10
    npv = npf.npv(discount_rate, free_cash_flows)
    
    # IRR Calculation with safety logic
    try:
        irr = npf.irr(free_cash_flows)
        if irr is None or math.isnan(irr) or math.isinf(irr):
            irr = 0.0
    except (ValueError, TypeError):
        irr = 0.0
    
    # Average DSCR (only for years with debt service)
    active_dscr_years = [dscr for dscr in dscr_values if dscr < 100.0]
    avg_dscr = sum(active_dscr_years) / len(active_dscr_years) if active_dscr_years else 100.0
    
    # Average ROE
    avg_roe = sum(roe_values) / len(roe_values) if roe_values else 0.0
    
    # Global ROI (Total Net Profit / Total Capex)
    global_roi = (total_net_profit / capex_total_php) if capex_total_php > 0 else 0.0
    
    # Summary metrics
    summary_metrics = {
        "NPV": round(npv, 2),
        "IRR": round(irr, 4) if irr != 0.0 else 0.0,
        "Avg_DSCR": round(avg_dscr, 2),
        "Avg_ROE": round(avg_roe, 4),
        "ROI": round(global_roi, 4)
    }
    
    return {
        "summary_metrics": summary_metrics,
        "annual_data": annual_data
    }
