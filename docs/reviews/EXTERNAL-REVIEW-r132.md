# External Review - Round 132 (codex)

Reviewer: codex (real external run). Scope: commit ebd2d3e, HEAD=ebd2d3e.

1. [severity major] scripts/polish-explanations.mjs:56 - Undiacritized Vietnamese glosses pass the “English” filter: `'can't' nghia la 'khong the'` still requires `khong the` to survive verbatim, rejecting a correct rewrite containing `không thể`. - Identify taught English terms from choices/answers or explicitly distinguish glosses before preservation checks.

2. [severity minor] scripts/polish-explanations.mjs:37 - Curly contractions remain broken: `‘can’t’` captures only `can`, allowing a rewrite that drops `’t` to pass preservation validation. - Allow internal apostrophes in the curly-quote branch and verify preservation of the complete contraction.

