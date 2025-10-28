# Help Document: Intelligence Monitor Upgrades

## NEW: Alert Treatment Workflow

### What Changed?

Previously, accepting an alert automatically updated your risk register. Now, accepting an alert adds it to a **Treatment Log** where you can review and manually apply changes.

### Why This Change?

- **More Control**: You decide when to update risks
- **Better Documentation**: Add notes on how you handled each alert
- **Batch Processing**: Review multiple alerts before making changes
- **Audit Trail**: Track who applied what and when

### How It Works Now

**Step 1: Review Alert**
- Go to Intelligence tab → Pending alerts
- Click "Review" on any alert
- You'll see:
  - Risk code **AND** risk description (NEW!)
  - Event details
  - AI reasoning
  - Suggested likelihood change

**Step 2: Accept or Reject**
- **Accept**: Adds alert to treatment log for manual application
- **Reject**: Dismisses the alert with a reason

**Step 3: Apply Treatment (for accepted alerts)**
- Go to "Accepted" tab
- Review accepted alerts
- For each alert:
  - Review the suggested change
  - Add treatment notes (optional but recommended)
  - Click "Apply to Risk Register"
  - Risk likelihood is updated
  - Alert marked as "Applied"

### Treatment Notes Best Practices

When applying an alert, document:
- Why you're accepting the suggested change
- Any additional analysis you did
- Related controls you're implementing
- Date you expect to see improvement

**Example:**
```
Accepted +1 likelihood increase for STR-CYB-001.
Industry trend shows ransomware attacks increasing 40% in financial sector.
Initiated emergency security audit and MFA rollout.
Will reassess in 30 days after controls are active.
```

## NEW: Bulk Delete Pending Alerts

### What It Does

Deletes ALL pending alerts at once. Useful when:
- You have many outdated alerts
- Starting fresh after system changes
- Clearing test data

### How to Use

1. Go to Intelligence tab
2. Check the pending alerts count
3. Click "Delete All Pending" button (red, top right)
4. Confirm deletion
5. All pending alerts are permanently removed

**Warning:** This cannot be undone! Accepted/rejected alerts are NOT deleted.

## NEW: Risk Descriptions in Alerts

### What Changed?

Alert cards and review dialogs now show:
- Risk Code (e.g., "STR-CYB-001")
- **Risk Title** (e.g., "Increased Cyber Threat Landscape") - NEW!
- **Risk Description** (full risk details) - NEW!

### Why This Helps

- Understand the risk without switching screens
- Better context for reviewing alerts
- Faster decision-making

### Where You'll See It

1. **Alert Cards**: Small preview below risk code
2. **Review Dialog**: Full description in alert summary section

## Workflow Comparison

### Old Workflow (Automatic)
```
1. Alert Created
      ↓
2. Review Alert
      ↓
3. Accept (checkbox: "Apply to Risk")
      ↓
4. Risk Likelihood AUTOMATICALLY Updated ⚠️
```

### New Workflow (Manual)
```
1. Alert Created
      ↓
2. Review Alert
      ↓
3. Accept → Goes to Treatment Log
      ↓
4. Review Treatment Log
      ↓
5. Add Treatment Notes
      ↓
6. MANUALLY Apply to Risk Register ✓
      ↓
7. Risk Likelihood Updated
```

## FAQ

**Q: What happens to existing accepted alerts?**
A: They're grandfathered in. New accepted alerts will use the new workflow.

**Q: Can I still auto-apply alerts?**
A: No, manual application is now required for all new alerts. This ensures proper documentation and review.

**Q: Where do I see applied alerts?**
A: In the "Accepted" tab, alerts show:
- ✓ Applied (green) - Already in risk register
- Pending Application (yellow) - Need to apply

**Q: Do I have to add treatment notes?**
A: No, treatment notes are optional but highly recommended for audit purposes.

**Q: Can I bulk apply alerts?**
A: Not currently. Each alert must be individually reviewed and applied to ensure proper consideration.

**Q: What if I accept an alert by mistake?**
A: Simply don't apply it from the treatment log. It won't affect your risk register until you manually apply it.

**Q: Can I delete accepted alerts?**
A: No. Once accepted, alerts become part of your audit trail. You can only delete pending alerts.

## Tips & Best Practices

1. **Review Daily**: Check pending alerts daily to stay current

2. **Use Treatment Notes**: Always document your reasoning when applying alerts

3. **Batch Review**: Review multiple alerts, then apply them together during your weekly risk review

4. **Monitor Trends**: Look for patterns in alerts affecting the same risks

5. **Cleanup Regularly**: Use bulk delete to clear irrelevant pending alerts

6. **Trust the AI... But Verify**: AI suggestions are good starting points, but you make the final call

## Integration with Other Features

### Risk Register
- Applied alerts update risk likelihood
- `last_intelligence_check` timestamp updated
- View alert history from risk details

### Audit Trail
- All alert decisions logged
- Treatment notes preserved
- User attribution for applied changes

### Reports
- Include alert activity in risk reports
- Show trends in external threats
- Document risk landscape changes

## Need Help?

- Check `INTELLIGENCE-UPGRADES-COMPLETE.md` for technical details
- Review `INTELLIGENCE-SYSTEM-STATUS.md` for system architecture
- Contact support if you encounter issues

---

**Version:** 1.0
**Last Updated:** 2025-10-28
**Related Documents:** INTELLIGENCE-UPGRADES-COMPLETE.md, INTELLIGENCE-SYSTEM-STATUS.md
