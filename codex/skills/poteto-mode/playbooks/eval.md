### Eval

**You own the experiment design. Plan, blind, run, synthesize.**

**Non-negotiables for blinding:**

- Keep meta-instructions, comparison labels, scores and rubrics out of each candidate’s directories, files and briefing. The worker instructions and the assigned task use ordinary project terminology.
- Give each candidate the same ordinary user task as its goal, with the shared worker instructions. Keep the coordinator’s evaluation goal and rubric private.
- No chain-eliciting cues. Don't ask the candidate to list which skills, principles, or files they applied. Ask for design notes generally and grade chain-following from code shape, not self-report.
- Sanitize directory and slug names. Use project-shaped names a user might pick.
- Don't tell the candidate other candidates exist.
- The judge can know it's judging but sees outputs by sanitized label only, never by model name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from.

**Steps:**

1. **Frame.** State what variant is under test and what behavior counts as success. Write the rubric (3-6 concrete criteria) for the judge only. Hold it back from candidates.
2. **Set up sanitized environments.** Per-candidate working dir with the variant in place. Plant any context an organic task would have: a project skeleton, the skills the candidate would naturally read.
3. **Author one organic prompt.** What a user would type. No leakage of what's being measured.
4. **Spawn N parallel candidates** on different models per the **arena** skill's Phase B. Each works in its own sanitized dir. For helpers that only dispatch, poll, or collect results, choose a lower supported effort within the configured budget. Same prompt to each. Pick each subagent's effort, and fast mode when the session exposes it, for the job, per the Subagents section.
5. **Select a blinded judge** per the **arena** skill's Phase C. If no eligible judge can run, report the missing independent score. Judge sees outputs by sanitized label and the rubric, never a model name.
6. **Verify the chain from transcripts, not self-report.** Read each candidate's local transcript using the exact active-session path or history API described in Codex runtime. Do not glob across unrelated project transcript directories. That crosses workspace boundaries and reads private chats from unrelated projects. Look at which files each candidate actually opened. Grade chain-following from the files it really read plus the shape of the code, never from the candidate's own claims.
7. **Read every candidate output yourself** end to end. Compare with the judge’s rationale when a judge ran. Explain material disagreements and give your recommendation.

**Reply:** variant under test, rubric, per-candidate notes, judge’s verdict or reason for skipping it, your synthesis, and a recommendation for whether to promote the variant.
