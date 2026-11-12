"""
Find formula that gives 58 for Scenario A
"""
def solve_formula():
    t, r, k, f, m = 25, 35, 40, 45, 50
    w = [0.25, 0.20, 0.15, 0.15, 0.25]
    scores = [t, r, k, f, m]
    ws = sum(s * wt for s, wt in zip(scores, w))
    print("Weighted sum:", ws)
    
    # Maybe scores are out of 100 where higher is better, or maybe the formula is:
    # Total = sum(score * weight) * scaling_factor + offset
    # Or maybe each score is normalized differently.
    # If expected score is 58 when OBI=50, let's check ratio 58 / 38.5 = 1.506...
    # Or maybe: 100 - weighted_sum? No.
    # What if the scores are: Trend=65, Risk=70, etc.? But prompt gave specific numbers: Trend=25, Risk=35, Katalizör=40, Fiyat=45, Mikroyapı=50.
    # Wait! What if the weights are multipliers on 100?
    # Let's write a flexible function.
    pass

if __name__ == "__main__":
    solve_formula()
