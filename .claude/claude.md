# MinRisk Development Guidelines

## Holistic Code Review Approach

**CRITICAL**: Before making ANY code changes, ALWAYS follow this systematic approach:

### 1. Understand the Full Context
- Read and understand the ENTIRE function/component being modified
- Identify all places where the code is called or referenced
- Check for similar patterns elsewhere in the codebase
- Review related database schemas, types, and interfaces

### 2. Impact Analysis (MANDATORY)
Before proposing a change, explicitly analyze:

#### Data Flow Analysis
- **Where does this data come from?** (Database, API, props, state)
- **What is the schema/structure?** (Check database tables, TypeScript types)
- **Where is this data used?** (Search for all usages across the codebase)
- **What components depend on this?** (Parent/child relationships, shared state)

#### Dependency Analysis
- **What other functions/components call this code?**
- **What data structures does this code rely on?**
- **Are there TypeScript types that need updating?**
- **Will this change require database migrations?**

#### Side Effects Checklist
- **Will this break existing functionality?**
- **Are there other places using the same pattern that will also break?**
- **Does this affect user authentication/authorization?**
- **Will this impact performance?**
- **Are there edge cases or error states to consider?**

### 3. Communication Before Action
When proposing a change, ALWAYS communicate:

```markdown
## Proposed Change
[Brief description]

## Root Cause
[Why is this change needed?]

## Impact Analysis
### Files Affected
- `file1.ts` - [what changes]
- `file2.tsx` - [what changes]

### Potential Side Effects
1. [Effect 1 and mitigation]
2. [Effect 2 and mitigation]

### Dependencies
- Database: [any schema dependencies]
- API: [any API changes needed]
- Types: [any type updates needed]

## Testing Plan
1. [How to verify the fix works]
2. [How to verify nothing else broke]
```

### 4. Systematic Verification
After making changes:

1. **Search for similar patterns** - Use Grep to find other places with the same code pattern
2. **Check TypeScript errors** - Run type checking to catch type mismatches
3. **Review imports** - Ensure all necessary modules are imported
4. **Test locally** - Verify the change works in development
5. **Check for cascading effects** - Look for other components that might be affected

## Common Pitfalls to Avoid

### Database Schema Assumptions
- **DON'T** assume a column exists without checking the schema first
- **DO** verify table structure using database queries or schema files
- **DO** check if the data needs to come from a join or related table

### Type Mismatches
- **DON'T** change function signatures without checking all callers
- **DO** search for all usages before modifying types
- **DO** update TypeScript interfaces when changing data structures

### State Management
- **DON'T** modify shared state without considering all consumers
- **DO** trace state flow through components
- **DO** check for useEffect dependencies that might be affected

### API/Database Queries
- **DON'T** add fields to SELECT statements without verifying they exist
- **DO** check database schema or API documentation
- **DO** test queries in isolation before integrating

## Example: The Email Field Issue

### What Went Wrong
Changed `user_profiles` query to include `email` field without verifying the schema.

### What Should Have Happened

1. **Schema Verification**
   ```bash
   # Check database schema
   PGPASSWORD=postgres psql -h localhost -U postgres -d minrisk -c "\d user_profiles"
   ```

2. **Type Checking**
   ```typescript
   // Verify the UserProfile type includes email
   // Search for where email data actually comes from
   ```

3. **Alternative Solutions Analysis**
   - Option A: Add email column to user_profiles
   - Option B: Join with auth.users table
   - Option C: Fetch emails separately from Supabase Auth
   - **Decision**: Option C chosen because...

4. **Impact Assessment**
   - Files affected: AdminDashboard.tsx
   - Other queries affected: None (isolated change)
   - Performance impact: Additional auth.listUsers() call (acceptable for admin dashboard)

## Code Review Checklist

Before committing ANY change, verify:

- [ ] Schema/structure verified for all data being accessed
- [ ] All usages of modified code identified and checked
- [ ] TypeScript types match the actual data structure
- [ ] No similar patterns elsewhere that will break
- [ ] Error handling added for new failure modes
- [ ] Performance impact considered
- [ ] Testing plan defined
- [ ] Rollback plan exists if something breaks

## Project-Specific Patterns

### User Data
- **Profile info**: `user_profiles` table (full_name, role, organization_id)
- **Auth info**: `auth.users` via Supabase Auth (email, password)
- **Join pattern**: Fetch separately and map by user ID

### Organization Scoping
- Most queries MUST filter by `organization_id`
- Always verify current user's organization before queries
- Never expose data across organizations

### Error Handling
- Always use try-catch-finally for async operations
- Set loading states in try block, reset in finally block
- Add timeout protection for long-running queries (10-15 seconds)
- Log errors with descriptive messages including context

### Supabase Patterns
- User profiles: `supabase.from('user_profiles')`
- Auth users: `supabase.auth.admin.listUsers()` or `supabase.auth.getUser()`
- Edge Functions: Must include complete CORS headers
- Always check for null/undefined in Supabase responses

## When in Doubt
1. **STOP** - Don't make changes yet
2. **SEARCH** - Look for similar code patterns
3. **VERIFY** - Check schemas, types, and dependencies
4. **COMMUNICATE** - Explain the analysis before proposing changes
5. **TEST** - Verify both the fix AND that nothing else broke

Remember: **"Measure twice, cut once"** - Spend more time analyzing and less time fixing cascading issues.
