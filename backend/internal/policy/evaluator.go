package policy

import (
	"strings"

	"github.com/netfoe/scapegoat/backend/internal/models"
)

type EvaluationResult struct {
	Status string
	Reason string
}

func EvaluateComponent(component models.Component, policy *models.Policy) EvaluationResult {
	if policy == nil {
		return EvaluationResult{Status: "unknown", Reason: "No policy defined for product"}
	}

	// 1. Check disallowed dependencies
	if policy.DisallowedDeps != "" {
		disallowedDeps := strings.Split(policy.DisallowedDeps, ",")
		for _, d := range disallowedDeps {
			d = strings.TrimSpace(d)
			if d != "" && strings.Contains(strings.ToLower(component.Name), strings.ToLower(d)) {
				return EvaluationResult{Status: "denied", Reason: "Disallowed dependency: " + d}
			}
		}
	}

	// 2. Check disallowed licenses
	if policy.DisallowedLicenses != "" {
		disallowedLicenses := strings.Split(policy.DisallowedLicenses, ",")
		for _, l := range disallowedLicenses {
			l = strings.TrimSpace(l)
			if l != "" && strings.Contains(strings.ToLower(component.License), strings.ToLower(l)) {
				return EvaluationResult{Status: "denied", Reason: "Disallowed license: " + l}
			}
		}
	}

	// 3. Check allowed licenses
	if policy.AllowedLicenses != "" {
		allowedLicenses := strings.Split(policy.AllowedLicenses, ",")
		found := false
		for _, l := range allowedLicenses {
			l = strings.TrimSpace(l)
			if l != "" && strings.Contains(strings.ToLower(component.License), strings.ToLower(l)) {
				found = true
				break
			}
		}
		if !found {
			return EvaluationResult{Status: "denied", Reason: "License not in allowed list"}
		}
	}

	return EvaluationResult{Status: "allowed", Reason: "Complies with policy"}
}
