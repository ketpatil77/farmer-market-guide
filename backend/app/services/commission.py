def calculate_commission(deal_value: float) -> dict:
    if not isinstance(deal_value, (int, float)):
        raise TypeError("deal_value must be numeric")
    if deal_value < 0:
        raise ValueError("deal_value cannot be negative")
    if deal_value == 0:
        return {
            "platform_fee": 0.0,
            "facilitator_fee": 0.0,
            "farmer_receives": 0.0,
            "total_commission": 0.0,
        }
    return {
        "platform_fee": round(deal_value * 0.03, 2),
        "facilitator_fee": round(deal_value * 0.02, 2),
        "farmer_receives": round(deal_value * 0.95, 2),
        "total_commission": round(deal_value * 0.05, 2),
    }
