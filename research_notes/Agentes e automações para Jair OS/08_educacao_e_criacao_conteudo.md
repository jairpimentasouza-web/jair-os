# AI tools, agents and automation for (A) STEM teaching, tutoring and school ops and (B) educational content creation, with a Brazil focus (state as of 23 Nov 2026)

Conventions: every claim is dated. **[BG]** = background fact from before 2026. **[2026]** = 2026 fact. "Search summary" = the detail came from a search-engine result summary and the page itself was not opened. Treat those as lower confidence. The web-search budget ran out partway through, so some planned sub-topics are listed under Gaps.

---

## A1. AI tutoring evidence (2025–2026) and design principles

### Takeaway
By late 2026 the evidence is clearly **conditional**. Tutors that are tightly scaffolded, grounded in vetted solutions and that force step-by-step student work have shown large short-term gains (Harvard physics 2025, Nigeria 2025). Answer-giving or loosely integrated tutors show no effect or harm on unaided tests: the PNAS 2025 high-school math study, the Maryland RCT with 2,379 students in Oct 2026, and the expanded Eedi/Google RCT in Oct 2026 that found no standardized-test gain. The outcome that counts is unaided, delayed performance. In-session accuracy is not a valid measure.

### Cited Findings
**Positive, scaffolded designs**
- [BG, Jun 2025] Harvard RCT (Kestin, Miller et al., *Scientific Reports*, 3 Jun 2025). Setting: intro physics (PS2), N≈194. An AI tutor ("PS2 Pal", GPT-4) beat in-class active learning. Median post-test was 4.5 vs 3.5 from a pre-test median of 2.75. Effect size was 0.63 by linear regression (the authors call this an underestimate because of a ceiling effect) and 0.73–1.3 SD by quantile regression. Median time on task was 49 min vs a 60-min class, and time on task did not correlate with scores. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/)
- [BG] Kestin tutor design principles: active engagement, managing cognitive load, growth-mindset messaging, sequential scaffolding through each part of a problem, **accuracy through pre-written step-by-step solutions** (to limit hallucination), timely on-demand feedback and self-pacing. The tutor was told to reveal one step at a time and never the full solution. Limits: one course, Bloom levels up to "analyze", reactive rather than proactive, text-only, and months of development work. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/); [Hechinger](https://hechingerreport.org/proof-points-ai-tutor-harvard-physics/)
- [BG, May 2025] World Bank Policy Research WP 11125, "From Chalkboards to Chatbots". RCT of a 6-week after-school English program using GPT-4 in Edo State, Nigeria (data collected May–Jul 2024). Effect was +0.23 SD in English, which beat about 80% of comparable developing-country education RCTs. The authors say the effect belongs to the **whole package** (structured prompts, curriculum alignment, teacher support, peer learning), not the chatbot on its own. — [World Bank OKR](https://openknowledge.worldbank.org/entities/publication/15e1ff08-15ae-4f7a-b2a8-d146e6c113ee/full); [WB blog](https://blogs.worldbank.org/en/education/From-chalkboards-to-chatbots-Transforming-learning-in-Nigeria)
- [BG, Oct 2024] Stanford "Tutor CoPilot" RCT: 900 tutors and 1,800 K-12 students in virtual math tutoring. The AI gives the **human tutor** real-time suggestions, for example asking the student to identify the numbers in the problem or to draw it. Students were +4 pp more likely to master topics (intent-to-treat), and up to +9 pp when their tutor was lower-rated or less experienced. Cost was about $20 per tutor per year. Some suggestions were not grade-appropriate. — [arXiv 2410.03017](https://arxiv.org/pdf/2410.03017v2); [Stanford NSSA](https://nssa.stanford.edu/studies/tutor-copilot-human-ai-approach-scaling-real-time-expertise)
- [2026] RCT in *Journal of Economic Education* (macroeconomics, four sections randomized): every treatment arm beat control, and **GenAI combined with study groups** produced the largest gain. — [JEE 2026](https://doi.org/10.1080/00220485.2026.2695361)
- [2026, May] Nursing anatomy RCT (362 randomized, 301 completed): an AI tutor backed by a knowledge graph scored 82.5 vs 77.6 (blended) and 74.1 (traditional). — [PubMed](https://pubmed.ncbi.nlm.nih.gov/42174555/)
- [2026, Jul/Oct] Contractor & Reyes, arXiv 2607.08849 (v1 9 Jul 2026, v2 4 Oct 2026). Proctored in-person RCT with unaided tests taken immediately and one week later. AI access raised scores and a smaller gain lasted a week. Gains **held for students who used AI as a tutor ("augmentation") and faded for those who had AI write for them ("automation")**. — [arXiv](https://arxiv.org/abs/2607.08849)

**Null or negative results**
- [BG, 2025] Bastani et al., *PNAS* 122(26), about 1,000 Turkish high-school math students. During practice, "GPT Base" was +48% and the guarded "GPT Tutor" +127% vs control. On the exam without AI, GPT Base was **17% worse than control** and GPT Tutor about equal to control. Most Base users simply asked for the answer. — [Wharton Knowledge](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/); [IDEAS/RePEc](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)
- [2026, Oct] University of Maryland RCT, EdWorkingPaper 26-1598 (Liu, Sweet et al.): 2,379 undergraduates and 30 instructors. A course-integrated GenAI tutor **lowered final grades by 0.37 SD** and **LMS participation by 0.90 SD** within the same courses. Losses were larger for first-generation students. The authors' reading is that the tutor *displaced* existing learning activities. Working paper, not peer-reviewed. — [EdWorkingPapers](https://edworkingpapers.com/ai26-1598)
- [BG, Dec 2025] Eedi and Google DeepMind exploratory RCT on LearnLM, UK secondary math, AI messages approved by a human. LearnLM did at least as well as human tutors. Students were 5.5 pp more likely to solve novel problems on later topics (66.2% vs 60.7%), and about 0.1% of messages had factual errors. — [arXiv 2512.23633](https://arxiv.org/abs/2512.23633v1); [Google LearnLM report](https://services.google.com/fh/files/misc/learnlm_oct26.pdf)
- [2026, Oct 29] Expanded Eedi/Google RCT run Apr–Jul 2026: 1,179 students, 10 UK state schools, one 30–35 min class a week for 10 weeks, four arms (static remediation, human chat tutor, AI with human approval, AI given a summary of each student's history). **In-session** follow-up accuracy was 56–58% with any tutoring vs 43% with static remediation. On the **Star Maths standardized test there was no gain** over static remediation, and human tutoring came out slightly lower. Giving the AI the student's background did not help. Humans approved 94.7% of AI drafts unchanged. Eleven AI messages contained false math statements and seven of those reached students. About **1 in 5 students never replied** when a tutor popped up. Boys tutored after each mistake did worse, possibly because the prompt felt like a "signal of failure" (tentative). Eedi has started a trial with more than 15,000 students where the AI is direct and humans step in only when needed. — [The 74](https://www.the74million.org/article/five-things-you-should-know-about-new-ai-tutor-study/)
- [BG, Dec 2025] A Microsoft Research review of GenAI and learning outcomes concludes that general-purpose tools without pedagogical scaffolding can hurt critical thinking. — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2025/10/GenAILearningOutcomes_published_2025-12-16.pdf)
- [2026] A 2026 review summarized by search: advantages from AI help can vanish on unaided tests (example: base AI group −0.19 SD vs control, tutor-prompted group −0.01 SD). Khan Academy plus Khanmigo showed modest gains but limited sustained tutor use. (Search summary.) — [EdWorkingPapers](https://edworkingpapers.com/sites/default/files/ai26-1598.pdf)

### Inferences
- Design rules for Jair OS, drawn from the converging evidence:
  1. Ground the tutor in **Jair's own commented answer keys**, as PS2 Pal did with pre-written solutions.
  2. Give **one step at a time** and never the final answer unless the student has attempted it.
  3. Always end with an **unaided check** (exit item, spaced retrieval) and treat that as the KPI, not chat accuracy.
  4. **Complement** human sessions rather than replace them, because of the UMD displacement effect.
  5. Pair the tutor with peer or human structure, as in the Nigeria and JEE results.
  6. Do not interrupt after every mistake (Eedi boys finding). Use opt-in hints instead.
- The best-evidenced model for a teacher with about 14 students is **Tutor CoPilot**: an AI that coaches the tutor in real time and does not talk to the student directly. This fits the existing pre-class prep and post-class voice-debrief workflows.
- For EJA adults with weak reading and writing, text chat tutors may underperform. The Eedi result that chat favours "confident readers/writers" points toward voice or worked-example formats.

### Gaps
- No 2026 meta-analysis of K-12 AI tutoring RCTs was found. Spaced-repetition and retrieval-practice studies specific to AI-generated items in 2026 could not be searched because the search budget ran out.
- No Brazilian RCT of AI tutoring for high-school STEM was found.

---

## A2. Education AI products and Brazil availability (Google, OpenAI, Anthropic, Khan, others)

### Takeaway
Google is the only major vendor with **Brazil-specific, free, student-facing** offerings in 2026: Gemini ENEM practice tests (announced 10 Jun 2026), Ask Studio in Portuguese for creators, NotebookLM/"Gemini Notebook" student features, and a free AI Plus year for students outside the US. **ChatGPT for Teachers and Claude for Teachers are both US-only**, free for verified US K-12 educators. Google's teacher-facing Classroom AI and the upcoming Classroom MCP server are where Jair OS integration matters most.

### Cited Findings
**Google / Gemini for Education**
- [2026, Jan, Bett] Google announced:
  - Gemini working inside Classroom on live class data.
  - A redesigned Classroom homepage dashboard.
  - Native audio, video and screen recording for assignments and feedback.
  - A **learning-standards tagging pilot that explicitly includes Brazil**.
  - Khan Academy Writing Coach (Gemini, grades 7–12).
  - Free Princeton Review SAT practice tests in Gemini.
  - NotebookLM grounding and Moodle LTI, both upcoming.
  - Gemini in Workspace for more educators and students at no extra cost.
  — [EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/bett-2026-google-announces-major-ai-updates-to-gemini-and-google-classroom)
- [2026, Feb 4] Classroom API **Student Groups endpoints went GA**. — [Workspace Updates](https://workspaceupdates.googleblog.com/2026/02/student-group-endpoints-google-classroom-api.html)
- [2026, H1] Classroom developer update: Course `levels` and `subject` fields, add-on submission fields, and `ListAddOnAttachmentStudentSubmissions` targeted for Q4 2026. `courses.list` can no longer take both teacherId and studentId in one call. — [classroom-dev-announce](https://groups.google.com/g/classroom-dev-announce/c/Mfn4--dPc-s)
- [2026, Apr 27] Students can create personal class notebooks with NotebookLM inside Classroom. The Studio panel offers Audio and Video Overviews, study guides, flashcards and diagrams, with up to 50 sources per notebook. It is on by default only for some users (e.g. 18+ higher-ed students), and some features are 18+ only. Limits were raised for Education Plus and Teaching & Learning licences. — [Workspace Updates](https://workspaceupdates.googleblog.com/2026/04/students-can-now-create-personal-class-notebooks-with-NotebookLM-in-Google-Classroom.html); [limits post](https://workspaceupdates.googleblog.com/2026/04/expanded-notebooklm-capabilities-for-Education-Plus-and-Teaching-and-Learning-add-on-customers.html?hl=en_IN)
- [2026, Jun 2] Utah adopted Gemini for Education statewide for K-12 from the 2026–27 school year, with district opt-out. — [USBE](https://www.schools.utah.gov/publicrelations/_publicrelations_/_2026/USBEAdoptsGeminiEducationPressRelease.pdf)
- [2026, Jun 10] At Google for Brasil 2026, Google announced:
  - **Free on-demand ENEM practice tests in the Gemini app and AI Mode**, expected the following month. Gemini can spot learning gaps, build study plans and run practice sessions.
  - More than R$5M from Google.org for **Experience AI**, an AI-literacy program for teachers built by DeepMind and the Raspberry Pi Foundation and delivered by Sincroniza Educação. Coverage gives a target of about 16,000 public-school teachers.
  - **Ask Studio in Portuguese for most Brazilian YouTube creators.**
  - Free Gemini AI Plus through Itaú loyalty and Vivo.
  — [Google Blog BR](https://blog.google/intl/pt-br/novidades/tecnologia/google-for-brasil-2026/); [O Liberal](https://www.oliberal.com/tecnologia-e-mercado/google-destinara-r-5-milhoes-para-capacitar-professores-de-escolas-publicas-em-ia-1.1131851)
- [2026, Jun 25, ISTE] Google announced:
  - A **Classroom app inside Gemini** that uses assignments and grades to find learning gaps and draft activities (English only, Workspace for Education users 18+).
  - "Teacher-led" Guided Learning, study notebooks and NotebookLM for Classroom, all "coming months".
  - Gemini LTI, with Schoology now, Canvas soon, Moodle with manual sources.
  - Chromebook Focus Mode that locks screens to NotebookLM or test prep (requires Education Plus or T&L).
  - A **Google Classroom MCP server** ("coming months") so external platforms can reference Classroom context.
  - Data is not used to train models.
  — [Google Blog](https://blog.google/products-and-platforms/products/education/iste-2026-educator-updates/)
- [2026, Sep 15] Digital Trends calls the product "**Gemini Notebook (formerly NotebookLM)**". New features: real-time voice conversations with notebooks in about 100 languages (Ultra first), a lecture recorder, short-answer, multi-select and fill-in quiz formats, **~60-second Video Overviews in 80+ languages**, and expanded interactive learning overviews. **Students outside the US get a free year of Google AI Plus** until the end of 2026. The exact rename date was not confirmed. — [Digital Trends](https://www.digitaltrends.com/computing/gemini-notebooks-latest-update-makes-it-a-better-study-companion/)
- [BG, Sep 2025] NotebookLM added flashcards, quizzes, Learning Guide and new Audio Overview formats. — [Google Blog](https://blog.google/technology/google-labs/notebooklm-student-features/)
- [2026, Sep 1] Khanmigo with Google.org and Gemini added **interactive, manipulable diagrams** for math and science, and a rebuilt "Practice My Knowledge" where teachers upload materials and review, edit or reject AI multiple-choice items before release. Khan reports early gains in "next-item correctness" but gives no figures. Available to districts using Khanmigo. — [EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/khan-academy-brings-gemini-powered-visual-tutoring-into-classrooms-for-2026); [Google Blog](https://blog.google/products-and-platforms/products/education/khan-academy-back-to-school/)
- [BG, 2025] Goiás (220,000 Chromebooks, Workspace and Gemini for Education, more than 600,000 students) and Minas Gerais (more than 1.3M students in 3,400 schools) are Google for Education cases in Brazil. (Search summary; exact source page not verified.) — [Google Blog BR](https://blog.google/intl/pt-br/novidades/iniciativas/destaques-do-googler-for-education-em-2025/)
- [2026, Jan] ABMES and Google for Education signed a partnership for higher education, piloting at Ser Educacional and Cruzeiro do Sul. — [ABMES](https://abmes.org.br/noticias/detalhe/5184/abmes-e-google-for-education-firmam-parceria-inedita-para-impulsionar-a-inteligencia-artificial-nas-ies-brasileiras)

**OpenAI**
- [BG, Jul 2025] ChatGPT **Study Mode** uses Socratic questioning and holds back answers. It is available on Free and paid plans and later on Edu. Students can switch it off easily. No 2026 update was found. — [OpenAI](https://openai.com/index/chatgpt-study-mode/)
- [BG, Nov 2025 → 2026] **ChatGPT for Teachers** is free for verified **US** K-12 educators until June 2027 (one pt-PT page says 2028, which conflicts). No Brazil launch was found as of Nov 2026, and Brazilian press reports no forecast. — [OpenAI Help pt-BR](https://help.openai.com/pt-br/articles/12844995-chatgpt-para-professores); [OpenAI](https://openai.com/pt-BR/index/chatgpt-for-teachers/); [Quero Bolsa](https://querobolsa.com.br/revista/chatgpt-para-professores-beneficios-maleficios)
- [BG] Arco Educação (Brazil) has a partnership with OpenAI to build teacher tools. Arco reported 90% accuracy with GPT-4 on Portuguese pedagogical content tasks. — [OpenAI](https://openai.com/index/arco-education)
- [2026, Oct 15] OpenAI reportedly launched an "IA para Educadores" course in pt-BR on OpenAI Academy. (Search summary; exact page not verified.) — [OpenAI pt-BR education](https://openai.com/pt-BR/education/)

**Anthropic**
- [BG, Apr 2025] Claude for Education introduced **Learning mode**: Socratic questions and a focus on principles, within Projects. — [TechCrunch](https://techcrunch.com/2025/04/02/anthropic-launches-an-ai-chatbot-tier-for-colleges-and-universities)
- [2026, Jul 14] **Claude for Teachers**, free for verified **US** K-12 educators, extended on 13 Nov 2026 to run through 30 Jul 2028. It includes:
  - Teaching skills for lesson planning and differentiation.
  - Learning Commons standards mapping, plus OpenSciEd and IM curricula.
  - **Connectors to ASSISTments, Brisk, Canva Education, Coteach, Diffit, Eedi, MagicSchool, Snorkl and TeachFX**.
  - **Claude Code and Cowork for analysing de-identified class data and running scheduled tasks, e.g. a daily review of exit tickets**.
  - No training on teacher conversations, and a K-12 DPA.
  A school and district offering followed on 28 Aug 2026. Critics raised concerns (EdWeek, Jul 2026). — [Anthropic](https://www.anthropic.com/news/claude-for-teachers); [EdWeek](https://edweek.org/technology/anthropic-launches-claude-for-teachers-why-some-critics-are-concerned/2026/07)

### Inferences
- Jair is in Brazil and is not eligible for the free US teacher tiers. His practical free stack is Google: Gemini in Classroom (school accounts), Gemini Notebook, the ENEM practice tests in Gemini, and the free AI Plus year for students before the end of 2026. **Recommend to tutoring students before 31 Dec 2026**.
- The **Classroom MCP server**, once released, could replace or augment the custom Classroom posting workflow. Watch it and plan a migration. Student Groups being GA (Feb 2026) allows posting by remediation group, so differentiated homework can be posted to sub-groups in one class.
- The Brazil **standards-tagging pilot** (Bett 2026) suggests BNCC habilidade tags may come to Classroom. Jair OS materials should already carry BNCC codes (e.g. EM13CNT…) in metadata so they map later.
- The Claude for Teachers pattern ("scheduled daily exit-ticket review on de-identified data") is a template to copy inside Jair OS: a scheduled post-class job that de-identifies, analyses misconceptions and proposes the next lesson's warm-up.
- A Brisk Teaching MCP connector is already present in this Jair OS session's toolset (observed in the environment, not from a web source). Brisk is also a Claude for Teachers connector partner.

### Gaps
- No 2026 specifics were found for MagicSchool, Brisk, Eduaide or Microsoft Copilot for Education. The search budget was exhausted before Microsoft was covered.
- The exact launch date of the Gemini ENEM practice tests (announced for "the following month", i.e. ~Jul 2026) and how good they are were not verified. Estadão/TecMundo blocked fetching.
- Brazilian ENEM edtechs with AI (question banks, essay correctors) beyond academic tools were not mapped, because the search budget ran out.

---

## A3. Automated grading and feedback (handwritten math/physics, ENEM essays) and AI-driven remediation

### Takeaway
Vision LLMs in 2026 grade **fully correct** handwritten STEM work reliably. **Partial credit and transcription** are still the weak points: in one AIED 2026 study, 87% of the best model's errors were transcription failures. ENEM essay AI is fairly reliable on the formal competencies (C1, C4) and unreliable on interpretive ones (C2, C3, C5). In Brazil, the CNE guidelines homologated on 10 Nov 2026 make **AI-only essay or dissertative grading illegal**. Any Jair OS grading must be "AI suggests, teacher reads in full and decides".

### Cited Findings
- [2026, May 18] Levine, Aenlle, Zilles, West, Silva (AIED 2026), "Automated Grading of Handwritten Mathematics Using Vision-Capable LLMs". A single LLM call transcribes and applies an instructor rubric to work from two university STEM courses. Accuracy was high at rubric-item level. **87% of the best model's errors were transcription failures**. Other failure modes: image quality, hallucinated content, and equivalent expressions marked wrong. — [arXiv 2605.19043](https://arxiv.org/abs/2605.19043)
- [2026, May 22 / Jun 28] Donaldson et al., "Using LLMs in Physics Education" (UCL per search summary). Models "reliably evaluate fully correct handwritten work" but "**assigning partial credit to flawed or incomplete reasoning remains a persistent challenge**". Native multimodality fixed earlier diagram and geometry problems. Earlier over-marking is much reduced. ChatGPT-5.1 and Gemini 3.0 Pro are named as strong. — [arXiv 2605.23660](https://arxiv.org/abs/2605.23660)
- [2026, Mar] Two 2026 math-grading papers (search summary). The first: human-in-the-loop LLM assistance **cut grading time by about 23%** with agreement comparable to or better than manual grading (VUB). The second: an OCR+LLM pipeline across 20 quizzes and more than 1,000 calculus students where **AI scores were reference-only and TA scores stayed official** (UC Irvine). An earlier GPT-4V+MathPix pipeline reached about 60% accuracy. Which paper is which between the two arXiv IDs was not verified. — [arXiv 2603.13083](https://arxiv.org/html/2603.13083); [arXiv 2603.00895](https://arxiv.org/pdf/2603.00895v1)
- [BG, Nov 2024] A hands-on physics grading test found only GPT-4 gave good results, and only when a human checked the OCR'd text. — [arXiv 2411.13685](https://arxiv.org/pdf/2411.13685)
- [2025–2026] Brazilian studies of ENEM essay AI:
  - Systems roughly agree with humans on individual competencies, but **overall scores diverge substantially**.
  - Systems do better on **C1 and C4** (formal aspects). **C2, C3 and C5** (interpretation, argument, intervention proposal) are less reliable, and generative feedback tends to be generic.
  - Scores are unstable for the same text across runs and models.
  - Tools mentioned: EnemIA (UFMG) and REDAMAX (11.34 s per essay).
  - Minas Gerais credits ENEM-trained human correctors with making its tool reliable.
  (Search summary.) — [Texto Livre/UFMG](https://periodicos.ufmg.br/index.php/textolivre/article/view/58426); [UFCG](https://revistas.editora.ufcg.edu.br/index.php/leia/article/download/6493/5132/15387); [Agência Minas](https://agenciaminas.mg.gov.br/news/pdf/122883.pdf); [Band, Apr 2026](https://www.band.com.br/educacao/queroestudarmedicina/noticias/como-usar-ia-na-redacao-do-enem-sem-prejudicar-o-desempenho-202604230951)
- [2025–2026] **Redação Paraná** (Seed-PR with Google): AI correction of dissertative-argumentative essays since 2025 (version 2.0 in Jul 2025), extended to conto, crônica and relato (date not confirmed). More than 250,000 students (state headline). A *Texto Livre* 2026 paper argues the teacher's role stays essential. The performance claims come from the state itself, with no independent evaluation. — [AEN-PR](https://www.parana.pr.gov.br/aen/Noticia/Redacao-Parana-correcao-por-inteligencia-artificial-e-ampliada-para-novos-generos); [AEN-PR 250k](https://www.parana.pr.gov.br/Audio/Mais-de-250-mil-alunos-usam-sistema-inovador-para-correcao-de-redacoes); [Texto Livre 2026](https://periodicos.ufmg.br/index.php/textolivre/article/view/62011)
- [BG, May 2025] São Paulo's TarefaSP piloted AI homework correction on GPT-4o mini for about 5% of tasks. The state also planned ChatGPT-drafted digital lessons with teacher review, which drew a complaint to the Ministério Público. No 2026 status was found. — [Metrópoles](https://www.metropoles.com/sao-paulo/ia-rede-publica-sp-corrigir-licao); [InfoMoney](https://www.infomoney.com.br/?p=2435058)
- [2026, Nov 10] **CNE/MEC rule** (details in A5):
  - Essay grades without full human reading are banned. "Just confirming the tool's suggested grade or approving corrections in bulk is prohibited". Students have a right to human review.
  - Essay **pre-correction is "high risk"**, which requires an algorithmic impact assessment.
  - Objective tests may use automation with prior, **documented human validation** (Canaltech).
  - Sources conflict on pre-scoring. Canaltech (11 Sep 2026) says schools cannot even have AI pre-grade and suggest a score. Porvir (10 Nov 2026) says AI may support pre-correction if the teacher reads every text in full.
  — [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/); [Canaltech](https://canaltech.com.br/inteligencia-artificial/o-que-muda-com-nova-regra-do-governo-que-proibe-ia-de-corrigir-redacoes-e-provas/)

### Inferences
- **Proposed Jair OS workflow, "Correção assistida de resoluções" (handwritten physics and math):**
  1. Photo upload.
  2. The vision LLM produces a **transcription that Jair confirms first**, since that is where 87% of errors occur.
  3. Rubric-item suggestions (setup, equations, units, numerical result, significant figures).
  4. **Numerical claims are re-checked deterministically** (e.g. through `jair_os_calcular` or sympy).
  5. Partial-credit items are flagged for human judgement.
  6. Jair writes or approves feedback item by item, with **no bulk approval**.
  7. Audit log.
  This complies with the CNE rules and targets the documented failure modes.
- **ENEM essay workflow:** AI gives *formative* comments mainly on C1 and C4, and flags C2, C3 and C5 for Jair. **No numeric score is shown until Jair has read the essay in full.** Version history and a "request human review" button support the student's right to review.
- **Error-to-remediation loop:** each confirmed error type (e.g. sign convention in kinematics, a vector component swapped) becomes a tagged misconception. That generates isomorphic variants with deterministic answer verification, scheduled as spaced retrieval in the student portal (e.g. D+1, D+3, D+7, D+21) and shown in the parent view as progress. This uses existing exercise-list and answer-key generation.
- Use Classroom Student Groups (GA) to push targeted remediation sets to misconception clusters.

### Gaps
- No Portuguese-language benchmark of vision-LLM grading of handwritten high-school physics, or of military-exam-style (EsPCEx/AFA/EN/ITA/IME) discursive answers, was found.
- No independent accuracy audit of Redação Paraná or of commercial ENEM essay correctors was found.
- 2026 empirical work on AI-generated spaced-repetition items (efficacy, item quality) was not searched (search budget).

---

## A4. STEM content generation tools (Manim, GeoGebra, simulations) and correctness verification

### Takeaway
The 2026 research consensus is **code-generated visuals** (Manim, GeoGebra, TikZ) driven by agent pipelines: planner, coder, retrieval over library docs, render-error repair and VLM screenshot critique. These are more accurate than diffusion video, but physics reliability still needs independent checks. Formal or automated reasoning tools (GeoGebra Discovery) and "AI-audit" tasks are emerging as verification and teaching devices.

### Cited Findings
- [2026, Jan] **PhysicsSolutionAgent**: physics explanation videos up to about 6 min, with planner and coder agents (GPT-5 mini) driving Manim, RAG over the Manim docs to cut invented functions, and a **VLM critique loop on screenshots**. The authors say reliable Manim code is still a key limitation. — [arXiv 2601.13453](https://arxiv.org/abs/2601.13453)
- [2026, Apr] **LLM2Manim**: a semi-automated, human-in-the-loop pipeline for narrated math and physics Manim animations. Students scored slightly higher post-test with it vs PowerPoint (83% vs 78%, p<.001) and finished faster. A second April 2026 paper argues **LLM plus code libraries like Manim beats diffusion video models on accuracy and efficiency**. The mapping of the two papers to the IDs comes from the search summary. — [arXiv 2604.18364](https://arxiv.org/abs/2604.18364); [arXiv 2604.05266](https://arxiv.org/abs/2604.05266)
- [BG, 2025] Earlier work in the same pattern: TheoremExplainAgent (planner plus Manim coding agent) and Manimator (paper → structured scene description → Manim code). — [arXiv 2502.19400](https://arxiv.org/pdf/2502.19400); [arXiv 2507.14306](https://arxiv.org/html/2507.14306v1)
- [2026] Practitioner lesson (anecdotal, search summary): long single-shot generation collapses. What worked was a director agent producing scene JSON, a coder writing code **scene by scene** with fixed imports, and repair from Manim error logs. — [LinkedIn (search result)](https://bd.linkedin.com/in/shahriarrakin1)
- [2026, Jul] GeoGebra Discovery (automated geometry reasoning) was presented alongside the observation that general chatbots have only partial automated reasoning. A 2026 classroom study used an "**AI audit**" task in which students check pre-generated AI responses, about 70% of which contained errors. — [SCML 2026](https://scml.risc.jku.at/conference-2026/presentations/scml2026.09.kovacs-et-al.pdf); [NCM 2026](https://ncm.gu.se/wp-content/uploads/2026/03/5151_25_4.pdf)
- [2026, Jan] A journal study found ChatGPT combined with GeoGebra engaged math students, and noted the limits of ChatGPT-3.5 as a tutor. GeoGebra hosts 2026 teacher prompt guides and custom GPT or Gemini Gem resources. No official built-in GeoGebra AI assistant announcement was found. — [ERIC EJ1494390](https://files.eric.ed.gov/fulltext/EJ1494390.pdf); [GeoGebra prompts](https://www.geogebra.org/m/xya4f3x8)
- [2026, Sep 1] Khanmigo now generates **interactive diagrams** (charts, geometric shapes) that students manipulate, with the tutor adapting to their changes. This shows mainstream products moving toward manipulable visuals. — [EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/khan-academy-brings-gemini-powered-visual-tutoring-into-classrooms-for-2026)
- [BG, Nov 2025; 2026, Feb 26] Nano Banana Pro (Gemini 3 Pro Image) is pitched for legible text and "educational diagrams" needing precision. Nano Banana 2 (Gemini 3.1 Flash Image) is faster, with legible text and in-image translation and localization. A PCWorld hands-on found text breaks down when zoomed in, and no independent diagram-accuracy benchmark was found. — [Google Blog NB2](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/); [Google Blog NB Pro](https://blog.google/technology/ai/nano-banana-pro/); [PCWorld](https://www.pcworld.com/article/3072664/nano-banana-2-has-an-ace-up-its-sleeve.html)

### Inferences
- **Proposed Jair OS "Physics Animation Agent":**
  1. A scene planner outputs JSON (objects, quantities, time steps).
  2. A **deterministic physics solver** computes trajectories, forces and field values, for example with numpy/sympy or `jair_os_calcular`.
  3. The Manim coder renders *from solver outputs only*. The LLM never invents numbers.
  4. Automated assertions run on the rendered frames: positions vs the analytical solution, vector directions, units on labels.
  5. A VLM screenshot critique checks layout and legibility.
  6. Jair approves.
  This extends the existing "deterministic or independently verified" diagram gate to video, and suits short MRU/MRUV, projectile, circuit and optics clips for both lessons and Shorts.
- Use image models (Nano Banana) **only for decorative or hook imagery and thumbnails**, never for physics diagrams with quantitative content. Keep TikZ, Manim or GeoGebra for anything a student could measure or reason from.
- **"Audite a IA" activity generator:** produce AI solutions to ENEM or military-style items with deliberately planted, documented errors, for students to find. This builds critical thinking and the AI literacy the CNE guidelines now require in basic education (A5), and fits the "safe AI in school 2026" consulting line.
- GeoGebra applets with sliders, or LLM-generated single-file HTML simulations, can serve as "manipulable" portal items, like the Khanmigo diagrams. Validate them with the same solver assertions.

### Gaps
- No 2026 data was found on PhET AI features, Desmos AI, Wolfram/LLM integration updates, or TikZ-generation benchmarks (search budget exhausted).
- No Portuguese-language Manim agent or dataset was found.

---

## A5. Brazil context: CNE/MEC AI guidelines, phone law, ENEM 2026, states, EJA, ECA Digital and LGPD

### Takeaway
On **10 Nov 2026** the MEC homologated **Parecer CNE/CP nº 15/2026**, which created binding national guidelines for AI in education. The resolution is registered as **Resolução CNE/CP nº 1, de 11/11/2026**. It sets four risk levels, prohibitions effective immediately (AI-only essay grades, detector-only punishment, emotion recognition, continuous biometric surveillance, using minors' data to train third-party models, fully automated retention decisions) and **12 months** for schools to adapt (≈ Nov 2027). ENEM 2026 has been held. The phone law is 92% adopted. The ECA Digital has been in force since 17 Mar 2026.

### Cited Findings
**CNE/MEC AI guidelines**
- [2026, Apr 9] The MEC published the guidance document "Inteligência Artificial na Educação Básica: Caminhos para o Currículo e a Prática Docente". — [Undime](https://undime.org.br/noticia/09-04-2026-23-24-mec-lanca-orientacoes-sobre-ia-na-educacao-basica)
- [2026, May] The CNE approved a preliminary parecer for public consultation on Participa + Brasil. — [Mattos Filho](https://www.mattosfilho.com.br/unico/cne-ia-educacao-brasileira/); [Acessa](https://www.acessa.com/noticias/2026/05/324381-conselho-nacional-de-educacao-aprova-proposta-de-uso-ia-nas-escolas-saiba-o-que-vai-acontecer.html)
- [2026, Sep 1] The CNE approved the final text unanimously (rapporteurs Celso Niskier and Israel Batista). [2026, Nov 10] Minister Leonardo Barchini homologated Parecer CNE/CP 15/2026. The resolution is listed as Resolução CNE/CP nº 1 of 11 Nov 2026. — [Revista Educação (sponsored piece)](https://revistaeducacao.com.br/2026/11/11/mec-diretrizes-uso-ia/); [MEC Normas](https://mecnormas.mec.gov.br/pesquisa/detalhar/15979); [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/)
- [2026, Nov 10] Content, per Porvir:
  - Scope: all levels and modalities.
  - **Four risk levels** (arts. 36–42):
    - *Baixo*: e.g. lesson planning, summarizing.
    - *Moderado*: continuous interaction or personalization without automatic effects on grades, **e.g. a study tutor**.
    - *Alto*: may influence assessment or trajectories, **e.g. essay pre-correction, dropout prediction**. Requires an algorithmic impact assessment and, where applicable, a data-protection impact report.
    - *Excessivo*: prohibited, e.g. emotion inference by camera, automatic failing.
  - Prohibitions: an essay grade without human correction; punishment based only on a detector (detectors only as an "elemento auxiliar"); using minors' educational data to train third-party models; continuous surveillance; automatic grade-based failing.
  - Rules by stage:
    - Early childhood: no child use at all.
    - Grades 1–5: **no student interaction with generative or conversational AI, even supervised** (assistive technology exempt).
    - Grades 6–9: only professional-mediated activities.
    - **Ensino médio**: general basic-education rules, progressive curricular integration, mediation and data protection.
  - Teacher-training degrees (licenciaturas) must include digital literacy.
  - Prohibitions apply immediately, with 12 months to adapt rules, practices and contracts.
  — [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/)
- [2026, Nov 11] Additional items from a sponsored practitioner piece (lower confidence):
  - Ensino médio requires **mandatory declaration of AI use** and authorship rules.
  - Schools should form an **AI committee**, inventory and risk-rate tools, revise vendor contracts (audits, no use of student data), and train teachers within paid hours.
  - Legal responsibility sits with the institution, the mantenedora and suppliers, not individual teachers.
  - In distance education, "Mediação por IA não conta como tutoria".
  — [Revista Educação](https://revistaeducacao.com.br/2026/11/11/mec-diretrizes-uso-ia/)
- [2026, Sep 11] Canaltech: teachers may still use AI for planning, organizing materials, translating, summarizing and adapting. Commercial use of educational data is banned. Institutions must monitor vendor errors and bias. — [Canaltech](https://canaltech.com.br/inteligencia-artificial/o-que-muda-com-nova-regra-do-governo-que-proibe-ia-de-corrigir-redacoes-e-provas/)
- None of the guideline coverage fetched mentions **EJA** specifically. It falls under "todas as modalidades". — [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/)

**Phone law (Lei 15.100/2025)**
- [2026, Jun 30] MEC/Inep one-year review, a survey of 8,189 school managers (Mar–Apr 2026) with Alana and UNESCO:
  - **92% of schools** have adopted the rules, up from 13% that previously allowed unrestricted use.
  - Restriction in all school spaces rose from 20% to 48%.
  - **Pedagogical use is still allowed**, and 86% say digital pedagogical activities were kept or expanded.
  - Perceived effects: 97% report more participation, 95% better concentration, 86% less anxiety, 88% fewer conflicts and less cyberbullying.
  - Challenges: student adherence (39%), lack of storage, especially in public schools (45% vs 18% private).
  - These are perceptions, not measured outcomes.
  — [Agência Brasil](https://agenciabrasil.ebc.com.br/educacao/noticia/2026-06/lei-que-restringe-uso-de-celulares-ja-e-adotada-por-92-das-escolas)

**ENEM 2026**
- [2026] Exam days were **8 and 15 Nov 2026**. Day-2 abstention was **36%, the highest since 2020** (multiple outlets citing MEC). The official answer key came out **18 Nov 2026**. Reapplication is **15–16 Dec 2026**. **Results come out 18 Jan 2027** on the Página do Participante (gov.br login). Public-school concluintes participated in record numbers. — [Agência Gov (results date)](https://agenciagov.ebc.com.br/noticias/202611/resultados-do-enem-serao-divulgados-em-18-de-janeiro); [O Povo (abstention)](https://www.opovo.com.br/noticias/enem/2026/11/15/enem-2026-tem-maior-abstencao-dos-ultimos-5-anos-aponta-mec.html); [O Povo (gabarito)](https://www.opovo.com.br/noticias/brasil/2026/11/18/inep-divulga-gabarito-oficial-do-enem-2026-veja-como-consultar.html); [Agência Gov (record)](https://agenciagov.ebc.com.br/noticias/202611/enem-2026-tem-participacao-recorde-de-concluintes-da-rede-publica)
- [2026] Novelties per search summary: ENEM is integrated with Saeb so results also monitor learning at the end of high school, and graduating public-school students are **registered automatically**. Bem Paraná could not be fetched (403). — [Bem Paraná](https://www.bemparana.com.br/noticias/educacao/sai-edital-com-as-datas-do-enem-2026-confira-as-novidades-desta-edicao/); [Edital Inep 64/2026](https://abmes.org.br/arquivos/legislacoes/Edital-inep-064-2026-05-21.pdf)

**ECA Digital and data**
- [2026, Mar 17] **ECA Digital (Lei 15.211/2025)** came into force, with Decreto 12.880/2026 as regulation. It ends age self-declaration on platforms and allows fines up to R$50M. **ANPD became a regulatory agency** (Lei 15.352/2026, Feb 2026) and enforces it. — [Agência Senado](https://www12.senado.leg.br/noticias/materias/2026/03/17/eca-digital-para-protecao-on-line-de-criancas-e-adolescentes-entra-em-vigor); [Band](https://www.band.com.br/nacional/sp/o-eca-digital-entra-em-vigor-e-redefine-as-regras-de-protecao-de-menores)
- [2026, May 14] ConJur: schools have many questions since March 2026 about photographing or publishing minors. The decree requires **judicial authorization for monetized profiles that show children's routines**. — [ConJur](https://www.conjur.com.br/2026-mai-14/uso-de-imagem-de-menores-o-que-muda-e-o-que-nao-muda-com-o-eca-digital//?print=1)

**States and EJA**
- [2025–2026] Paraná is the leading state on AI in education: Redação Paraná (see A3), a Google partnership (Feb 2025), and a planned AI technical course in the public network. — [AEN-PR](https://www.parana.pr.gov.br/aen/Noticia/Parana-lanca-pacote-de-solucoes-de-Inteligencia-Artificial-inedito-no-Brasil)
- [2025–2026] EJA and AI: only academic work was found. UFRGS (CAp-UFRGS students), a Freirean analysis (ERAMIA-RS), and *Revista Tópicos* 2026 (GenAI helps writing in EJA when kept subordinate to formative goals and student participation). *Pesquisa FAPESP* (Mar 2026) reports EJA students are getting younger. — [RENOTE/UFRGS](https://seer.ufrgs.br/index.php/renote/article/view/149239); [SBC ERAMIA](https://sol.sbc.org.br/index.php/eramiars/article/view/39476); [Revista Tópicos](https://revistatopicos.com.br/generate/pdf_zenodo/pub_792789757.pdf); [Pesquisa FAPESP](https://revistapesquisa.fapesp.br/o-novo-perfil-da-educacao-de-jovens-e-adultos-no-brasil/)

### Inferences
- **Direct compliance impact on existing Jair OS capabilities** (his school roles fall under the resolution):
  - "Student 360" early warning or dropout prediction = **alto risco**. It needs an algorithmic impact assessment, human decision-making, no automated retention or failing, and documentation.
  - Grading assistance = alto risco. Teachers must read everything in full, with no bulk approval.
  - A student-facing study tutor = moderado.
  - Lesson planning and material generation = baixo.
  - Never send identifiable minors' data to vendors that train on it.
  - Add an **AI-use declaration** field to student submissions in ensino médio.
- **Consulting opportunity, with timing** ("safe AI in school 2026" / "AI Academy 2027"): schools have until about **Nov 2027**. A productized "Kit de Adequação CNE-IA" fits that window: committee charter, tool inventory spreadsheet with risk level per tool, contract-clause checklist, AI-use declaration templates for students, teacher training modules, a parent communication letter, and an algorithmic-impact template for alto-risco uses.
- **ENEM calendar hooks:** gabarito-based score estimates (TRI) are already relevant. Results on 18 Jan 2027, then SISU/ProUni guidance, then the 2027 study-plan launch, give a natural tutoring and content calendar for Dec 2026 to Feb 2027.
- **EJA:** most Google teacher and student AI features are gated to 18+. Adult EJA learners may be *eligible* where minors are not, which inverts the usual constraint. Combine that with voice-first formats (Gemini Notebook voice, Audio Overviews) given literacy heterogeneity. Pedagogical phone use is still allowed under Lei 15.100.
- **Creator side (ECA Digital):** never feature identifiable students (most tutoring students are minors) in monetized content. Use anonymized, text-only testimonials with written guardian consent.

### Gaps
- The official full text of Resolução CNE/CP 1/2026 was not fetched. Exact article numbers beyond 36–42 and whether EJA has specific provisions are unverified.
- The status of BNCC Computação implementation in 2026, Rio de Janeiro (state or municipal) AI initiatives, and the 2026 status of São Paulo's AI lesson and homework pilots were not found (search budget).
- Detailed ENEM 2026 format changes (item counts, redação theme) were not verified.

---

## B1. AI video, audio and image tools in 2026 and platform rules on AI content

### Takeaway
The 2026 landscape shifted sharply:
- **OpenAI announced Sora's shutdown (24 Mar 2026)**.
- **Google's Gemini Omni (19 May 2026)** became the main video model, available in Flow and the Gemini app, and **free in YouTube Shorts and the YouTube Create app**.
- YouTube **auto-dubbing is open to all creators (4 Feb 2026, 27 languages, expressive speech including PT/ES/EN)**.
- **ElevenLabs shipped Dubbing v2 (May 2026) and v4 (Sep 2026)**.
- YouTube's **16 Jul 2026 clarification** demonetizes template-based or repetitive content, distressing bait, and AI personas on sensitive topics. AI use as such is not penalized.

### Cited Findings
**Video**
- [2026, Mar 24] OpenAI announced it is ending the **Sora app, Sora.com and the API**. Per WSJ via PetaPixel, the company will not support video inside ChatGPT. Disney's deal was unwound. No final date was given in the reports. A third-party site claims consumer shutdown on 26 Apr 2026 and the API on 24 Sep 2026 (unverified). Sora was never officially available in Brazil (2025 reports). — [Axios](https://www.axios.com/2026/03/24/openai-discontinue-sora-video-app); [PetaPixel](https://petapixel.com/2026/03/24/openai-kills-sora-and-loses-disneys-1b-investment/); [9to5Google](https://9to5google.com/2026/03/24/openai-shutting-down-sora-video-generation-app-but-without-explaining-why/); [GlobalGPT (unverified dates)](https://www.glbgpt.com/de/hub/openai-sora-2-availability-in-brazil-how-to-get-early-access/); [Canaltech BR](https://canaltech.com.br/apps/ia-sora-chega-a-paises-vizinhos-mas-brasil-segue-de-fora/)
- [2026, May 19] **Gemini Omni / Omni Flash**:
  - A multimodal model family that generates and edits video from any mix of image, audio, video and text, combining Gemini with Veo, Nano Banana and Genie.
  - Conversational multi-step editing with character consistency.
  - About 10-second clips.
  - SynthID watermark by default.
  - Available on AI Plus, Pro and Ultra in the Gemini app and Flow. **Free in YouTube Shorts and YouTube Create**. API "within weeks".
  - Flow gained a **Flow Agent**.
  — [TechCrunch](https://techcrunch.com/2026/05/19/googles-gemini-omni-turns-images-audio-and-text-into-video-and-thats-just-the-start/); [9to5Google](https://9to5google.com/2026/05/19/gemini-omni-create-anything-model-video/); [The Next Web](https://thenextweb.com/news/google-gemini-omni-flash-video-model-io-2026)
- [2026, May] No Veo 4 as of late May 2026. Veo 3.1 is the latest documented Veo (third-party sources). — [PixVerse blog](https://pixverse.ai/en/blog/veo-4-release)

**YouTube**
- [2026, Sep 23, Made on YouTube]:
  - Omni in Shorts and Create was used by "hundreds of thousands of channels per day" in Aug 2026.
  - Announced: a Gemini conversational editing assistant for Shorts and Create, Ask Studio feedback on pacing and structure of drafts, channel-matched thumbnail generation, dynamic thumbnails, background refresh of old-video thumbnails, **A/B testing of up to three video cuts**, Insights and Research destinations, and opt-in AI comment moderation.
  - Likeness (deepfake) detection is open for sign-up, with speaking-voice detection coming later in 2026.
  — [YouTube Blog](https://blog.youtube/news-and-events/made-on-youtube-new-tools-power-creation-journey/)
- [2026, Feb 4] **Auto dubbing is available to everyone in 27 languages**. **Expressive Speech** is live for all channels in EN, FR, DE, HI, ID, IT, **PT, ES**. Lip Sync is still a pilot. Viewers can set a preferred language or choose the original. Creators can upload their own dubs or turn auto dubbing off. YouTube says dubs do not hurt discovery. — [YouTube Blog](https://blog.youtube/news-and-events/youtube-auto-dubbing-expressive-speech/)
- [BG, Sep 2025] Ask Studio (an AI channel assistant), Inspiration tab upgrades and likeness detection open beta for YPP. — [TechCrunch](https://techcrunch.com/2025/09/16/youtube-rolls-out-studio-updates-likeness-detection-lip-synced-dubs-creator-collabs-and-more)
- [2026, Jun 10] **Ask Studio is available in Portuguese for most Brazilian creators**: it summarizes comments, explains stats and generates ideas and outlines. — [Google Blog BR](https://blog.google/intl/pt-br/novidades/tecnologia/google-for-brasil-2026/)
- [2026, Jul 16] YPP "inauthentic content" clarification. Three non-monetizable types:
  - (1) **Generic, repetitive or template-based** mass-produced content. This can include tutorials that repeat material already common on the platform.
  - (2) Distressing or emotionally manipulative bait.
  - (3) **AI representations of real people discussing finance, legal or health topics**.
  Channels with too much of these lose monetization "regardless of whether the content is AI-generated" (Matt Halprin). The policy builds on the Jul 2025 rename from "repetitious" to "inauthentic". AI disclosure for realistic synthetic media is a separate requirement, and YouTube says disclosure does not limit reach or monetization (third-party summaries). — [TechCrunch](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/); [third-party summary](https://outlierkit.com/blog/youtube-updates-july-2026)

**Audio, avatars, image**
- [2026, May 28] **ElevenLabs Dubbing v2** works from the original audio, covers more than 90 languages and came with a Creator Dubbing Partner Program. API from 6 Aug 2026, possibly enterprise-first. [2026, Sep 28] **Eleven v4 and v4 Turbo**: more expressive, 90 languages, streams as the LLM generates. Existing clones may need retraining (one report). Fall 2026 NYC summit: custom models, agent memory, Scribe v3, Eleven Realtime. — [ElevenLabs Blog](https://elevenlabs.io/blog/introducing-dubbing-v2); [TechCrunch](https://techcrunch.com/2026/09/28/elevenlabs-new-v4-speech-model-supports-more-expression-control-and-90-languages/); [The Next Web](https://thenextweb.com/news/elevenlabs-summit-nyc-elevenai-custom-models-partner-program)
- [2026] HeyGen and Synthesia (vendor-sourced, search summary). HeyGen Avatar V was announced Apr 2026, and an "Avatar 6" technical report is dated 17 Nov 2026 (one arena ranked it first on short clips). Synthesia Sep 2026 added an **MCP integration to create videos from ChatGPT and Claude** and shareable team avatars. — [HeyGen Apr 2026](https://www.heygen.com/blog/heygen-april-2026-release); [Synthesia updates](https://www.synthesia.io/updates)
- [BG, Oct 2025] Meta AI translations for Reels (translate, dub, optional lip sync) added **Portuguese**. Free for all Instagram public accounts and for Facebook creators with 1,000+ followers. Labeled, and viewers can opt out. No Portuguese-specific change was found in 2026. — [Meta Newsroom](https://about.fb.com/news/2025/10/discover-reels-around-world-meta-ai-translation/); [TechCrunch](https://techcrunch.com/2025/10/09/meta-adds-hindi-and-portuguese-support-for-its-ai-translation-feature-for-reels)
- [2026, Feb 26] Nano Banana 2 (see A4) offers in-image text translation and localization, which is useful for turning PT thumbnails or carousels into ES/EN. — [Google Blog](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/)
- [2026, Sep 15] Gemini Notebook **~60-second Video Overviews in 80+ languages**, a potential fast "lesson recap" asset. — [Digital Trends](https://www.digitaltrends.com/computing/gemini-notebooks-latest-update-makes-it-a-better-study-companion/)

### Inferences
- **Remove Sora from any Jair OS tool plan.** For AI b-roll or hooks, use Gemini Omni free inside YouTube Create or Shorts. Use Flow (AI Plus/Pro) only if needed. Keep Manim, GeoGebra or TikZ for any physics visual (A4).
- **Monetization-safe strategy:** Jair's real face, voice and authorial problems are the moat against the July 2026 "template-based, repetitive tutorial" category. Avoid AI avatars of Jair for ENEM or vestibular advice at scale. Education is not one of the listed sensitive topics, but the avatar-persona risk and the authenticity signal both argue against it. Disclose realistic synthetic segments.
- **Spanish and English reach at near-zero cost:** enable YouTube auto dubbing with Expressive Speech for PT→ES/EN on physics explainers. Use ElevenLabs Dubbing v2 only for flagship or course content where quality matters. Translate thumbnails with Nano Banana 2.
- Use Ask Studio in Portuguese and the up-to-3-cut A/B tests as the analytics stage of the Creator Studio pipeline, feeding results back into idea selection.

### Gaps
- No 2026 data was gathered on Runway, Kling, Hailuo, Descript, CapCut AI, Opus Clip, Gamma or GPT-image, or on TikTok and Instagram 2026 AI-label and monetization rules (search budget exhausted).
- The official YouTube policy page wording for the July 2026 change was not fetched. One third-party blog claims the heading changed, which conflicts with the others.

---

## B2. Agentic content pipelines (idea → script → visual → edit → publish → analytics) and lesson repurposing

### Takeaway
In 2026 the common practice is n8n- or Make-style pipelines: transcript, then an LLM extracts hooks, insights and CTAs, then platform-specific scripts and clips, then publishing through upload APIs, then a tracking sheet. Many importable n8n templates exist for long video → Shorts with dubbing and upload. Platforms are also building the edit and analytics stages in natively (YouTube conversational editing, A/B cuts, Ask Studio). Hotmart and Synthesia expose MCP interfaces.

### Cited Findings
- [2026] n8n template 14191, "AI YouTube Shorts creator: prompt-based clipping, dubbing and social upload" (updated about 3 months before retrieval). Template 12191: Telegram-triggered, YouTube URL plus instructions, logged in Google Sheets, published via Blotato. Template 11645: short-form clips from YouTube with GPT-4o/Grok and Airtable. — [n8n 14191](https://n8n.io/workflows/14191-ai-youtube-shorts-creator-prompt-based-clipping-dubbing-and-social-upload/); [n8n 12191](https://n8n.io/workflows/12191); [n8n 11645](https://n8n.io/workflows/11645-generate-short-form-clips-from-youtube-videos-with-gpt-4o-grok-and-airtable/)
- [2026, Mar 31] Repurposing guide: an AI analyzer extracts hooks, insights, data points and CTAs, then routes them to 7 platform outputs. — [The AI Maker](https://aimaker.substack.com/p/ai-content-repurposing-n8n-workflow-7-platforms)
- [2025–2026] Community blueprint: blog post → videos and social posts → publish to X, IG, FB, LinkedIn and YouTube Shorts through an upload-post API. — [n8n Community](https://community.n8n.io/t/a-fully-automated-n8n-workflow-that-turns-any-blog-post-into-videos-social-media-content-and-email-campaigns-ready-to-publish-across-all-platforms/164098)
- [2026, Sep 23] YouTube's native pipeline pieces: a conversational editing assistant for Shorts and Create, AI thumbnails matched to the channel, A/B tests of up to 3 cuts, and Insights and Research hubs. — [YouTube Blog](https://blog.youtube/news-and-events/made-on-youtube-new-tools-power-creation-journey/)
- [2026, Sep 10] Hotmart released an **MCP** for natural-language sales and customer reports, and **Smart Studio**, which generates avatar-based ad variants from a script so a creator can test about 20 versions before recording the winner with their own face. — [Canaltech](https://canaltech.com.br/mercado/hotmart-fire-2026-com-launchpad-plataforma-aposta-em-ia-que-cria-aplicativos-e-vira-equipe-do-empreendedor)
- [2026, Sep] Synthesia MCP lets ChatGPT or Claude create videos (vendor, search summary). — [Synthesia updates](https://www.synthesia.io/updates)
- [2026, Jul 16] YouTube's template and repetition demonetization risk applies directly to fully automated pipelines (see B1). — [TechCrunch](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/)

### Inferences
- **Proposed Jair OS "Aula → Conteúdo" pipeline,** extending Creator Studio:
  1. Source: the post-class voice debrief plus lesson materials (never student data).
  2. Agent extracts 3–5 "teachable moments" (common misconceptions, elegant solutions).
  3. Per moment: a 45–60 s Short script, a 6–8 slide carousel, a text post and a newsletter blurb.
  4. Visuals: Manim or TikZ through the verified physics gate (A4). Optional Omni b-roll only for hooks.
  5. Jair records the face or voice segment. **Authenticity is required for monetization and is the moat.**
  6. A human approval gate before publishing. Staging, as with existing growth workflows.
  7. Publish to YouTube (auto-dub ES/EN), Instagram (Meta AI translation), TikTok.
  8. Analytics: Ask Studio PT, A/B cuts, back into an ideas backlog.
  Add a **variation guard** that blocks near-duplicate scripts or templates, to stay clear of YouTube's "repetitive or template-based" category.
- **"Question of the day" series:** turn the original military or vestibular-style questions Jair OS already generates into a recurring series with solution reveals. Each episode carries real authorial variation, which counters the template risk.
- Combine with the ENEM calendar (A5): answer-key commentary content (Nov), TRI explainer (Dec), result-day guidance (18 Jan 2027).

### Gaps
- No verified case studies were found of Brazilian educational YouTube channels running AI pipelines, or performance data for teacher-creators (search budget).
- Make.com 2026 templates and Opus Clip-style tools were not checked.

---

## B3. Monetization for educator-creators in Brazil (Hotmart, Kiwify, Eduzz) and AI funnels under ethical constraints

### Takeaway
Hotmart dominates 2026 AI news for Brazilian creators. At FIRE (10 Sep 2026) it announced Launchpad (AI app builder plus Hotpay), AI sales and billing agents, an MCP, Smart Studio avatar ad testing, auditable affiliate rankings, free native communities, and down payment plus up to 24 installments for high-ticket products. It published an Ethical AI Terms for Creators (updated Aug 2026). Paid-traffic costs reportedly rose 143% in 2026, which favours organic, community and affiliate-driven growth. No 2026 AI news was found for Kiwify or Eduzz.

### Cited Findings
- [2026, Sep 10, Hotmart FIRE, Belo Horizonte]:
  - **Launchpad**: build apps and software from text or audio prompts, connected to Hotpay (40+ payment methods, 28 currencies). Open beta.
  - **AI sales agent** recovers 16% of abandoned carts.
  - **AI billing agent** recovers up to 40% more overdue subscriptions.
  - **MCP** for reports.
  - **Smart Studio** avatar ad variants.
  - **Affiliate ranking "seasons"** ("buy the sale instead of the click").
  - Free **Hotmart Comunidades** (repurchase 3.5x higher among active users).
  - **Down payment plus up to 24 installments** with a contract at checkout for high-ticket products.
  - **Paid traffic costs +143% this year**.
  - Creators with more than 10 products earn on average 300% more than those with fewer than 5 (CEO, platform data).
  — [Canaltech](https://canaltech.com.br/mercado/hotmart-fire-2026-com-launchpad-plataforma-aposta-em-ia-que-cria-aplicativos-e-vira-equipe-do-empreendedor)
- [2026] Hotmart's AI sales agents are trained on the creator's own content and tone to answer prospects 24/7. Coverage notes the hallucination risk. Creators can **sell AI agents based on their own methodology**. Hotmart says it does not train global models on customer data, content or prompts. (Search summary.) — [Startups.com.br](https://startups.com.br/negocios/inteligencia-artificial/hotmart-aposta-em-ia-para-ampliar-receita-ate-em-produtos-fisicos/); [Estado de Minas, Mar 2026](https://www.em.com.br/economia/2026/03/7373050-inteligencia-artificial-vira-produto-na-economia-criativa-diz-hotmart.html)
- [2026] Reported market data (search summary; promotional source):
  - Gross sales of AI-related digital products were R$200M between Aug 2025 and Jul 2026, +354% vs the prior two years.
  - More than 340,000 users bought AI-related courses or solutions in 2025, +326% since 2023.
  — [Startupi](https://startupi.com.br/hotmart-fire-2026-belo-horizonte-inteligencia-artificial-creators/); [Startups.com.br](https://startups.com.br/negocios/inteligencia-artificial/hotmart-aposta-em-ia-para-ampliar-receita-ate-em-produtos-fisicos/)
- [2026, Aug] Hotmart "Termo de Uso Ético de Inteligência Artificial – Creators" (updated version) governs products with AI components. — [Hotmart Legal](https://hotmart.com/pt-br/legal/termo-de-uso-etico-de-inteligencia-artificial-creators)
- [2026] Kiwify fee per a third-party blog: 8.99% + R$2.49 per approved sale, no monthly or setup fee. Eduzz is framed as the platform for scaling and Kiwify as the starting point (comparison blogs; no AI launches found). — [Bit4Learn](https://bit4learn.com/pt/?p=1500); [Reportei](https://reportei.com/eduzz-ou-kiwify/)

### Inferences
- **Productization ideas aligned with Jair OS:**
  1. A "Tutor Socrático de Física ENEM/Militares" sold as a Hotmart AI product. It must follow the A1 design rules and the Hotmart Ethical AI terms. It is moderate risk under the CNE rules when used in schools, and age gating applies if students are minors (ECA Digital).
  2. A school-compliance kit and training (A5) as a B2B or consulting offer.
  3. Use Hotmart Comunidades (free) to retain course buyers.
  4. Affiliate "seasons" for other teachers selling the kit.
  5. Down payment plus installments for high-ticket mentorship (e.g. a military-exam track).
- **Ethical funnel constraints** to encode as gates:
  - AI sales agents must be grounded only in approved FAQ and product pages, escalate to a human on pricing, refund or student-specific questions, and never make outcome guarantees ("aprovação garantida").
  - No student images or results as social proof without consent (ECA Digital for minors).
  - Keep the existing "staging until human budget approval" policy for paid traffic. The +143% ad cost rise favours organic plus affiliates first.

### Gaps
- Kiwify and Eduzz 2026 AI features, fees and policies were not verified from primary sources.
- No data was found on conversion or revenue benchmarks specifically for STEM or ENEM teacher-creators in Brazil.

---

## B4. Notable YouTube channels and videos (Brazilian and international) on AI for teachers and AI content automation

### Takeaway
**This question could not be answered with verified sources.** The shared web-search budget ran out before channel and video searches could run, and listing channels from memory without dated sources would break the no-fabrication rule.

### Cited Findings
- [2026, Sep 23] Official YouTube "Made on YouTube 2026" post (a primary source for creator AI tooling, not a channel list). — [YouTube Blog](https://blog.youtube/news-and-events/made-on-youtube-new-tools-power-creation-journey/)
- [2026, Jun 10] Google for Brasil 2026 post (Ask Studio PT for Brazilian creators). — [Google Blog BR](https://blog.google/intl/pt-br/novidades/tecnologia/google-for-brasil-2026/)

### Inferences
- A follow-up search pass should target: (a) Brazilian channels on "IA para professores" and "IA na educação"; (b) Brazilian physics, math and ENEM channels that disclose AI use; (c) international channels on n8n, agents and content automation; (d) official Google for Education, OpenAI Academy (pt-BR course, Oct 2026) and Anthropic education video content. Each should be recorded with upload date and view count.

### Gaps
- No channel or video names, dates or metrics were collected (search budget exhausted). This needs a follow-up research pass.

---

## Synthesis: concrete new or improved Jair OS workflows (ranked by evidence × fit × compliance)

### Takeaway
The highest-value moves are:
- (1) Rebuild student-facing AI help around the Kestin/Bastani design (grounded in Jair's answer keys, step-by-step, measured by unaided checks).
- (2) Add a Tutor-CoPilot-style live assistant for Jair rather than more autonomous tutoring.
- (3) Make grading strictly "AI suggests, teacher reads in full", per the CNE rules of 10 Nov 2026.
- (4) Extend the verified-diagram gate to Manim animations driven by a deterministic solver.
- (5) Turn the CNE deadline (≈ Nov 2027) into a consulting product.
- (6) Run a lesson-to-content pipeline with authenticity and variation guards, plus free PT→ES/EN dubbing.

### Cited Findings
- Scaffolded, solution-grounded tutors produced 0.63–1.3 SD gains in a physics RCT. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/)
- Answer-giving AI → −17% on the exam. — [Wharton Knowledge](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/)
- A course-integrated tutor → −0.37 SD grades through displacement. — [EdWorkingPapers](https://edworkingpapers.com/ai26-1598)
- In-session gains did not transfer to a standardized test, and 1 in 5 students ignored pop-up tutors. — [The 74](https://www.the74million.org/article/five-things-you-should-know-about-new-ai-tutor-study/)
- AI coaching of human tutors → +4 to +9 pp mastery at about $20 per tutor per year. — [arXiv 2410.03017](https://arxiv.org/pdf/2410.03017v2)
- 87% of handwritten-grading errors are transcription errors. — [arXiv 2605.19043](https://arxiv.org/abs/2605.19043)
- Partial credit is still hard. — [arXiv 2605.23660](https://arxiv.org/abs/2605.23660)
- CNE: no AI-only essay grades, risk tiers, 12-month adaptation. — [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/)
- LLM plus Manim beats diffusion on accuracy, and VLM critique loops help. — [arXiv 2601.13453](https://arxiv.org/abs/2601.13453); [arXiv 2604.05266](https://arxiv.org/abs/2604.05266)
- YouTube demonetizes template or repetitive content (16 Jul 2026). Auto dubbing with PT/ES expressive speech is open to all (4 Feb 2026). — [TechCrunch](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/); [YouTube Blog](https://blog.youtube/news-and-events/youtube-auto-dubbing-expressive-speech/)
- Claude for Teachers shows the pattern of scheduled de-identified exit-ticket review. — [Anthropic](https://www.anthropic.com/news/claude-for-teachers)
- Classroom MCP server is coming, and Student Groups are GA. — [Google Blog](https://blog.google/products-and-platforms/products/education/iste-2026-educator-updates/); [Workspace Updates](https://workspaceupdates.googleblog.com/2026/02/student-group-endpoints-google-classroom-api.html)

### Inferences
**Teaching and tutoring**
1. **Tutor Socrático ancorado (portal)**:
   - Per-lesson tutor grounded *only* in Jair's commented answer key and formula sheet.
   - One step per turn, with "show me your attempt" before any hint.
   - No final answer until the student has attempted.
   - Logs struggle points. The KPI is unaided exit items plus D+7 retrieval, not chat accuracy.
   - Opt-in rather than pop-up (Eedi). Positioned as a complement to sessions (UMD).
   - CNE risk: moderado.
2. **CoPiloto ao vivo para o Jair** (online sessions):
   - A side panel listens to the shared screen or notes and suggests misconception-specific questions and next problems.
   - Builds on pre-class prep, and feeds the post-class debrief automatically.
3. **Erro → Revisão espaçada**:
   - Confirmed errors become misconception tags, then isomorphic variants with deterministic answer checks, then a D+1/D+3/D+7/D+21 retrieval schedule in the portal.
   - The parent dashboard shows mastery per BNCC habilidade or ENEM matrix descriptor.
4. **Exit-ticket diário agendado**:
   - A scheduled job de-identifies the day's exit tickets, clusters misconceptions and drafts the next warm-up.
   - Posts differentiated tasks to Classroom Student Groups after Jair approves.
5. **Correção assistida (handwritten STEM and ENEM essay)**:
   - Transcription confirmation, then rubric suggestions, then a deterministic numeric re-check, then Jair's full reading and per-item approval.
   - No score shown before human reading. "Request human review" button. Audit trail.
6. **AI-literacy "Audite a IA" packs**: planted-error AI solutions for students to critique. Serves CNE curricular AI literacy and the "safe AI in school 2026" initiative.

**School operations (CEJA / Student 360)**
7. **Student 360 under CNE alto-risco governance**:
   - Algorithmic impact assessment document.
   - Human-in-the-loop decision log.
   - No automated retention or failing.
   - Minimal data and no third-party training.
   - Explainable flags (attendance, missing work) rather than opaque scores.
   - EJA-specific signals (work-shift conflicts, returning-student gaps), plus voice-first outreach.
8. **Kit de Adequação CNE-IA** (consulting / AI Academy 2027):
   - Committee charter, tool inventory with risk tier, vendor-contract checklist, student AI-use declaration templates (ensino médio), teacher training modules, a parent letter, a detector-use policy ("auxiliar only").
   - Deadline ≈ Nov 2027.

**STEM visuals**
9. **Physics Animation Agent**: planner JSON, then a deterministic solver, then Manim rendering from solver outputs, then automated frame assertions and VLM critique, then Jair's approval. Reuse for lessons and Shorts. Image generators are only for thumbnails and hooks.

**Content and creator business**
10. **Aula → Conteúdo pipeline**: debrief/materials → teachable moments → Short, carousel, post, newsletter → verified visuals → Jair's own voice or face → approval gate → publish → auto-dub ES/EN, Meta translation → Ask Studio PT and A/B cuts → backlog. Includes a variation guard against "template" demonetization and an ECA Digital guard (no identifiable minors).
11. **ENEM-cycle content calendar**: gabarito commentary (done 18 Nov 2026), reapplication (15–16 Dec), TRI and score estimation (Dec), result day (18 Jan 2027), SISU guidance, then the 2027 plan launch.
12. **Monetization**:
    - A Hotmart AI product (Socratic tutor of Jair's method) under the Hotmart Ethical AI terms.
    - Free Comunidades for retention.
    - Affiliate seasons for the compliance kit.
    - Installments for high-ticket mentorship.
    - Grounded AI sales agent with human escalation and no outcome guarantees.
    - Paid traffic stays staged until Jair approves the budget.
13. **Tool hygiene**:
    - Drop Sora (discontinued).
    - Prefer Gemini Omni in YouTube Create (free) for b-roll.
    - Tell students about the free Google AI Plus year for non-US students (until 31 Dec 2026) and the Gemini ENEM practice tests.
    - Watch for the Classroom MCP server to replace or augment the custom posting workflow.

### Gaps
- None of these workflows has been piloted. The evidence is from other contexts (US/UK/Nigeria/Turkey), and no Brazilian high-school or EJA RCT exists. Recommend small A/B pilots inside Jair's tutoring cohort with unaided pre/post measures before scaling.
