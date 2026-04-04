def compute_risk_score(quiz_score: int, medication_count: int, role: str, warning_count: int) -> tuple[int, str]:
    """
    Computes a risk score (0-100) and risk level based on patient factors.
    Lower quiz score, more medications, elderly patients, and more warning signs increase the risk.
    """
    score = 0
    
    # 1. Base risk from quiz score (max 30)
    # If they got 0 right, +30 risk. If 3 right, 0 risk.
    score += max(0, (3 - quiz_score) * 10)
    
    # 2. Medication risk (max 30)
    # +5 points per medication, up to 30.
    score += min(medication_count * 5, 30)
    
    # 3. Warning signs risk (max 25)
    # +8.33 points per warning, effectively up to 25.
    score += min(warning_count * 8, 25)
    
    # 4. Role risk (max 15)
    # Elderly are more vulnerable, caregivers mean someone is watching over.
    role_lower = role.lower()
    if role_lower == "elderly":
        score += 15
    elif role_lower == "patient":
        score += 5
    elif role_lower == "caregiver":
        score += 0
        
    # Clamp to 0-100 just to be safe
    score = max(0, min(int(score), 100))
    
    # Determine risk level
    if score < 35:
        level = "low"
    elif score < 65:
        level = "moderate"
    else:
        level = "high"
        
    return score, level
