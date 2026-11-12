"""
Test different scoring formulas to match 58 total score in Scenario A
"""
def test_formulas():
    t, r, k, f, m = 25, 35, 40, 45, 50
    # Formula 1: Weighted sum
    w1 = t*0.25 + r*0.20 + k*0.15 + f*0.15 + m*0.25
    print("Formula 1 (Weighted sum):", w1)
    
    # Formula 2: Unweighted average
    w2 = (t + r + k + f + m) / 5
    print("Formula 2 (Simple avg):", w2)
    
    # Formula 3: If scores are already percentages and weights are multipliers
    # Let's check if there's an intercept or scale factor
    # e.g., base score + weighted sum
    pass

if __name__ == "__main__":
    test_formulas()
