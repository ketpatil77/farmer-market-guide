import pytest

from app.services.commission import calculate_commission


def test_standard_commission_390000_farmer_receives_370500():
    result = calculate_commission(390000)
    assert result["farmer_receives"] == 370500.0


def test_minimum_1000_total_commission_50():
    result = calculate_commission(1000)
    assert result["total_commission"] == 50.0


def test_large_10000000_farmer_receives_9500000():
    result = calculate_commission(10_000_000)
    assert result["farmer_receives"] == 9_500_000.0


def test_zero_returns_all_zeros():
    result = calculate_commission(0)
    assert result == {
        "platform_fee": 0.0,
        "facilitator_fee": 0.0,
        "farmer_receives": 0.0,
        "total_commission": 0.0,
    }


def test_negative_raises_value_error():
    with pytest.raises(ValueError):
        calculate_commission(-5000)


def test_float_rounds_2_decimals():
    result = calculate_commission(333.33)
    assert result["platform_fee"] == round(333.33 * 0.03, 2)
    assert result["total_commission"] == round(333.33 * 0.05, 2)


def test_string_raises_type_error():
    with pytest.raises(TypeError):
        calculate_commission("5000")
