/* Jair OS — Mini App do Telegram: Escola (notas, chamada, diário com lançamento ao vivo), Finanças, Tarefas e Listas.
   Notas por ditado (teclado do celular), chamada por toque, diário; lançamento no sistema da escola acompanhado em tempo real.
   Toda chamada à API leva o initData assinado pelo Telegram; o servidor confere a assinatura. */
(() => {
  "use strict";
  const API = "https://zfbcvoaxgswjsgbavobp.supabase.co/functions/v1/jair-os-telegram-v2";
  const tg = window.Telegram && window.Telegram.WebApp;
  const $view = document.getElementById("view");
  const state = { tab: "home", data: null, sel: {}, parsed: null, absent: new Set(), roster: {}, mainHandler: null, school: null, module: "escola", live: null };
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };

  // ---------- utilidades ----------
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else if (k === "style") el.style.cssText = v; // via CSSOM: permitido pela CSP (style-src 'self'), ao contrário do atributo
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const haptic = (t = "light") => { try { tg.HapticFeedback.impactOccurred(t); } catch (_) {} };
  const notifyH = (t) => { try { tg.HapticFeedback.notificationOccurred(t); } catch (_) {} };
  const toast = (msg) => { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); };
  const today = () => { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); };
  const fmt = (d) => { const [y, m, dd] = String(d).slice(0, 10).split("-"); return `${dd}/${m}`; };
  const num = (v) => (v == null || v === "" ? null : Number(String(v).replace(",", ".")));
  const ERR = {
    importe_a_lista_da_turma_primeiro: "Importe a lista oficial da turma primeiro (Início → turma).",
    nao_entendi_nenhuma_nota: "Não entendi nenhuma nota. Ex.: “Sofia sete e meio; Ruan 8,5”.",
    usuario_telegram_nao_pareado: "Este Telegram não está pareado com o Jair OS.",
    sessao_expirada_reabra_o_app: "Sessão expirada. Feche e abra o app de novo.",
    abra_pelo_telegram: "Abra pelo botão 🏫 Escola no Telegram.",
  };
  async function api(op, body = {}) {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, initData: tg ? tg.initData : "", ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: `http_${r.status}` }));
    if (!r.ok || j.ok === false) {
      const code = String(j.error || "erro").split(":")[0];
      throw new Error(ERR[code] || String(j.error || "erro").replace(/_/g, " "));
    }
    return j;
  }
  function setMain(text, handler, enabled = true) {
    if (!tg) return;
    if (state.mainHandler) tg.MainButton.offClick(state.mainHandler);
    state.mainHandler = null;
    if (!text) { tg.MainButton.hide(); return; }
    state.mainHandler = async () => { if (!enabled) return; try { tg.MainButton.showProgress(); await handler(); } catch (e) { notifyH("error"); toast(e.message); } finally { tg.MainButton.hideProgress(); } };
    tg.MainButton.setParams({ text, is_active: enabled, is_visible: true });
    tg.MainButton.onClick(state.mainHandler);
  }
  const confirmDialog = (msg) => new Promise((res) => (tg && tg.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));
  const allTurmas = () => (state.data ? state.data.turmas : []);
  const turmas = () => allTurmas().filter((t) => !state.school || t.school === state.school);
  const turma = (id) => allTurmas().find((t) => t.id === id);
  const md = (t) => (t && t.metadata) || {};
  const chipOf = (t) => md(t).chip || (/^\d$/.test(t.class_key) ? t.class_key + "ª" : t.class_key);
  const SCHOOL_NAMES = { mater: "Mater", legacy: "Legacy", ceja: "CEJA" };
  const schoolName = (k) => { const t = allTurmas().find((x) => x.school === k); return md(t).school_label || SCHOOL_NAMES[k] || k; };
  const schools = () => [...new Set(allTurmas().map((t) => t.school))];
  const fila = () => ((state.data && state.data.fila) || []).filter((b) => !state.school || !b.school || b.school === state.school);
  function pickSchool(k, quiet) {
    if (!k || k === state.school) return;
    state.school = k; store.set("jos_escola", k);
    for (const k of Object.keys(state.sel)) if (!["date", "text", "content"].includes(k)) delete state.sel[k];
    state.parsed = null; state.absent.clear();
    document.getElementById("subtitle").textContent = "Escola · " + schoolName(k);
    document.documentElement.dataset.school = k;
    if (!quiet) { haptic("medium"); toast(`🏫 ${schoolName(k)}`); }
  }
  function renderSchoolBar() {
    const bar = document.getElementById("schoolbar");
    if (!bar) return;
    const list = schools();
    bar.hidden = list.length < 2;
    bar.replaceChildren(...list.map((k) => h("button", { class: state.school === k ? "on" : "", onclick: () => { pickSchool(k); render(); } }, schoolName(k))));
  }
  const STATUS = { draft: ["Rascunho", "info"], confirmed: ["Aguardando", "warn"], dispatched: ["Lançando", "warn"], verified: ["Conferido", "ok"], partial: ["Parcial", "risk"], failed: ["Falhou", "bad"] };
  const KIND = { grade: ["📝", "Notas"], attendance: ["✅", "Chamada"], content: ["📖", "Diário"] };
  const SYSTEM = { unimestre: "Unimestre", activesoft: "ActiveSoft", planilha: "planilha", manual: "manual" };
  const MATCH = { exato: ["exato", "ok"], apelido: ["apelido", "ok"], provavel: ["provável", "warn"], ambiguo: ["ambíguo", "risk"], sem_par: ["sem par", "bad"] };

  function classChips(selected, onPick, opts = {}) {
    return h("div", { class: "chips" }, turmas().map((t) => h("button", {
      class: "chip" + (selected === t.id ? " on" : ""),
      onclick: () => { haptic(); onPick(t.id); },
    }, chipOf(t), h("small", {}, opts.showSchool ? t.school : t.subject || ""))));
  }

  window.JOS = { h, api, toast, haptic, notifyH, setMain, confirmDialog, today, fmt, num, state, store, tg, rerender: () => render() };

  // ---------- telas ----------
  function renderHome() {
    const d = state.data;
    const lst = fila();
    const pend = lst.filter((b) => ["confirmed", "dispatched"].includes(b.status)).length;
    const ok = lst.filter((b) => b.status === "verified").length;
    const draft = lst.filter((b) => b.status === "draft").length;
    setMain(null);
    return h("div", { class: "fade" },
      h("h2", {}, `Olá${d.nome ? ", " + d.nome : ""} 👋`),
      h("p", { class: "muted", style: "margin:0 4px 10px" }, "Notas por ditado, chamada por toque e diário — tudo conferido no destino."),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("b", {}, pend), h("span", {}, "na fila")),
        h("div", { class: "stat" }, h("b", {}, ok), h("span", {}, "conferidos")),
        h("div", { class: "stat" }, h("b", {}, draft), h("span", {}, "rascunhos"))),
      h("h3", {}, `Turmas · ${schoolName(state.school)}`),
      turmas().length ? turmas().map((t) => h("div", { class: "card" },
        h("div", { class: "row between" },
          h("div", { class: "grow" }, h("div", { class: "name" }, t.label), h("div", { class: "muted", style: "font-size:13px" }, `${t.subject || ""} · ${SYSTEM[t.system] || t.system} · ${t.roster_count} alunos`)),
          t.roster_count ? h("span", { class: "pill ok" }, "lista ok") : h("span", { class: "pill bad" }, "sem lista")),
        h("button", { class: "btn ghost", onclick: () => openImport(t.id) }, t.roster_count ? "Atualizar lista da turma" : "Importar lista da turma")))
        : h("div", { class: "empty" }, "Nenhuma turma cadastrada."),
    );
  }

  function openImport(classId) {
    const t = turma(classId);
    state.tab = "import";
    const ta = h("textarea", { placeholder: `Cole a lista do ${SYSTEM[t.system] || "sistema da escola"} — um aluno por linha.\nEx.:\n1 ANA LIMA PEREIRA\n2 BERNARDO SOUZA` });
    const count = h("div", { class: "hint" }, "0 alunos");
    ta.addEventListener("input", () => { const n = ta.value.split(/\n/).filter((s) => s.trim()).length; count.textContent = `${n} alunos`; setMain(n ? `Salvar lista (${n} alunos)` : null, save, n > 0); });
    const save = async () => {
      const r = await api("roster_import", { class_id: classId, names: ta.value });
      notifyH("success"); toast(`Lista salva: ${r.alunos} alunos`); await load(); go("home");
    };
    $view.replaceChildren(h("div", { class: "fade" },
      h("h2", {}, "Lista da turma"), h("p", { class: "muted", style: "margin:0 4px" }, t.label),
      h("label", { class: "field" }, h("span", {}, "Lista oficial (copie do sistema da escola)"), ta), count,
      h("p", { class: "hint" }, "Os nomes viram a referência para a conferência de nomes. Quem sair da lista fica inativo."),
      h("button", { class: "btn ghost", onclick: () => go("home") }, "Voltar")));
    if (tg) tg.BackButton.show();
    setMain(null);
  }

  // --- Notas ---
  function renderGrades() {
    const s = state.sel;
    if (!turmas().some((x) => x.id === s.class_id)) s.class_id = turmas()[0] && turmas()[0].id;
    const t = turma(s.class_id);
    const assess = (t && t.assessments) || [];
    if (!s.assess || !assess.find((x) => x.key === s.assess)) s.assess = assess[0] ? assess[0].key : null;
    const a = assess.find((x) => x.key === s.assess) || {};
    s.date = s.date || today();
    const ta = h("textarea", { placeholder: `Toque no 🎤 do teclado e dite:\n“${t && t.school === "legacy" ? "AV1, Amir seis e meio, Sara cinco; Jean faltou" : "Sofia dois e meio, Ruan três; Yasmin um vírgula oito"}”\nTambém vale número de chamada: “12 - 2,5”`, value: s.text || "" });
    ta.addEventListener("input", () => { s.text = ta.value; });
    const wrap = h("div", { class: "fade" },
      h("h2", {}, "Notas"),
      classChips(s.class_id, (id) => { s.class_id = id; state.parsed = null; render(); }),
      h("div", { class: "chips" }, assess.map((x) => h("button", { class: "chip" + (s.assess === x.key ? " on" : ""), onclick: () => { haptic(); s.assess = x.key; state.parsed = null; render(); } }, x.label, h("small", {}, `máx ${String(x.max).replace(".", ",")}`)))),
      h("label", { class: "field" }, h("span", {}, "Data da avaliação"), h("input", { type: "date", value: s.date, onchange: (e) => { s.date = e.target.value; } })),
      t && !t.roster_count ? h("div", { class: "card" }, "⚠️ Esta turma ainda não tem lista. ", h("a", { href: "#", onclick: (e) => { e.preventDefault(); openImport(t.id); } }, "Importar agora")) : null,
      state.data.ultimo_audio ? h("button", { class: "btn ghost", onclick: () => {
        haptic(); s.text = applyHeader(state.data.ultimo_audio.texto); state.parsed = null; render(); toast("🎙️ Áudio do Telegram carregado");
      } }, `🎙️ Usar último áudio (${new Date(state.data.ultimo_audio.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`) : null,
      h("label", { class: "field" }, h("span", {}, "Ditado ou digitação"), ta),
      h("p", { class: "hint" }, "Dica: mande um áudio no chat do bot (transcrito no iMac, sem custo) e toque em “Usar último áudio”."),
      h("button", { class: "btn", onclick: async () => {
        haptic("medium");
        s.text = applyHeader(s.text || "");
        const t2 = turma(s.class_id); const a2 = ((t2 && t2.assessments) || []).find((x) => x.key === s.assess) || {};
        try { state.parsed = await api("parse_grades", { class_id: s.class_id, text: s.text || "", max_value: a2.max }); notifyH("success"); render(); }
        catch (e) { notifyH("error"); toast(e.message); }
      } }, "✨ Interpretar"),
      t && md(t).segunda_chamada_codigo != null ? h("p", { class: "hint" }, `Quem faltou vai como ${md(t).segunda_chamada_codigo} (segunda chamada) no ${SYSTEM[t.system] || t.system}.`) : null,
      state.parsed ? renderParsed(a) : h("p", { class: "hint" }, "Nada é lançado agora: primeiro você confere a tabela e confirma."),
    );
    if (!state.parsed) setMain(null);
    return wrap;
  }

  // "Terceira série, prova, Sofia cinco e meio..." → seleciona turma/avaliação e remove o cabeçalho do ditado
  const ORD = { primeira: 1, "1a": 1, "1ª": 1, segunda: 2, "2a": 2, "2ª": 2, terceira: 3, "3a": 3, "3ª": 3 };
  const NUMW = { um: "1", uma: "1", dois: "2", duas: "2", tres: "3" };
  const assessKey = (x) => plainTxt(x).replace(/\b(um|uma|dois|duas|tres)\b/g, (w) => NUMW[w]).replace(/[^a-z0-9]/g, "");
  const plainTxt = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  function applyHeader(text) {
    const s = state.sel; const segs = String(text || "").split(/\s*(?:\n|;|,(?!\d))\s*/);
    let i = 0;
    for (; i < Math.min(segs.length, 4); i++) {
      const p = plainTxt(segs[i]);
      const esc = schools().find((k) => plainTxt(schoolName(k)) === p || k === p);
      if (esc) { pickSchool(esc, true); continue; }
      const serie = p.match(/^(primeira|segunda|terceira|[123]a|[123]ª)\s+serie\b/);
      const code = p.match(/^(?:turma\s+)?(\d{3,4})$/);
      const aval = turmas().length && turma(s.class_id) ? (turma(s.class_id).assessments || []).find((x) => assessKey(x.key) === assessKey(p) || assessKey(x.label) === assessKey(p)) : null;
      if (serie) { const t = turmas().find((x) => Number(md(x).serie || x.class_key) === ORD[serie[1]]); if (t) s.class_id = t.id; continue; }
      if (code) { const t = allTurmas().find((x) => x.class_key === code[1]); if (t) { pickSchool(t.school, true); s.class_id = t.id; continue; } }
      if (aval) { s.assess = aval.key; continue; }
      if (/^(notas?|turma|bimestre|avaliacao)\b/.test(p) && !/\d/.test(p)) continue;
      break;
    }
    if (i > 0) toast("Turma/avaliação ajustadas pelo ditado");
    return segs.slice(i).join(", ");
  }

  function renderParsed(a) {
    const p = state.parsed;
    const rows = p.linhas.map((l) => ({ ...l, escolhido: l.oficial || null, valorEdit: l.valor }));
    state.parsed._rows = state.parsed._rows || rows;
    const R = state.parsed._rows;
    const list = h("div", { class: "list" });
    const refresh = () => {
      const pend = R.filter((r) => !r.escolhido || (!r.ausente && (r.valorEdit == null || Number.isNaN(r.valorEdit) || (a.max != null && r.valorEdit > a.max) || r.valorEdit < 0)));
      const dup = new Set(); let dupBad = false; R.forEach((r) => { if (r.escolhido) { if (dup.has(r.escolhido)) dupBad = true; dup.add(r.escolhido); } });
      const n = R.filter((r) => r.escolhido).length;
      setMain(pend.length || dupBad ? (dupBad ? "Há aluno repetido" : `Resolva ${pend.length} pendência(s)`) : `⚡ Lançar ${n} notas agora`, confirmGrades, !pend.length && !dupBad && n > 0);
    };
    R.forEach((r) => {
      const [label, cls] = MATCH[r.status] || [r.status, "info"];
      const needsPick = !["exato", "apelido"].includes(r.status);
      const sel = needsPick ? h("select", { onchange: (e) => { r.escolhido = e.target.value || null; haptic(); refresh(); } },
        h("option", { value: "" }, "— escolher aluno —"),
        ...(r.candidatos || []).map((c) => h("option", { value: c.oficial, selected: r.escolhido === c.oficial }, `${c.oficial} (${Math.round(c.score * 100)}%)`)),
        h("option", { disabled: true }, "──────────"),
        ...p.roster.map((o) => h("option", { value: o }, o))) : null;
      const val = h("input", { class: "val", inputmode: "decimal", value: r.ausente ? "" : r.valorEdit == null ? "" : String(r.valorEdit).replace(".", ","), placeholder: r.ausente ? "falta" : "—",
        oninput: (e) => { r.valorEdit = num(e.target.value); refresh(); } });
      list.append(h("div", { class: "item" },
        h("div", { class: "grow" },
          h("div", { class: "name" }, r.escolhido || r.ditado || r.texto),
          h("div", { class: "sub" }, `“${r.texto}”`, " ", h("span", { class: `pill ${cls}` }, label), r.ausente ? h("span", { class: "pill bad", style: "margin-left:4px" }, "ausente") : null),
          sel),
        val));
    });
    refresh();
    return h("div", {},
      h("h3", {}, `Conferência · ${p.resumo.exato + p.resumo.apelido} certos · ${p.resumo.provavel + p.resumo.ambiguo + p.resumo.sem_par} para olhar`),
      list,
      p.roster_sem_nota && p.roster_sem_nota.length ? h("div", { class: "card" }, h("b", {}, `Sem nota (${p.roster_sem_nota.length}): `), h("span", { class: "muted" }, p.roster_sem_nota.join(", "))) : null,
      h("button", { class: "btn ghost", onclick: () => saveGrades(false) }, "Salvar como rascunho"));
  }

  function gradeEntries() {
    return state.parsed._rows.filter((r) => r.escolhido).map((r) => ({
      official_name: r.escolhido, spoken_name: r.ditado, value: r.ausente ? null : r.valorEdit, absent: r.ausente,
      match_status: ["exato", "apelido"].includes(r.status) && r.escolhido === r.oficial ? r.status : "confirmado",
    }));
  }
  async function saveGrades(confirm) {
    const s = state.sel; const t = turma(s.class_id); const a = (t.assessments || []).find((x) => x.key === s.assess) || {};
    const entries = gradeEntries();
    if (confirm && !(await confirmDialog(`Lançar agora ${entries.length} notas de ${a.label || s.assess} — ${t.label} no ${SYSTEM[t.system] || t.system}?\nO iMac lança e confere relendo; você acompanha aqui.`))) return;
    const r = await api("save_batch", { kind: "grade", class_id: s.class_id, label: s.assess, max_value: a.max, occurred_on: s.date, entries, confirm });
    notifyH("success");
    state.parsed = null; s.text = "";
    if (confirm) { showLive([r.batch_id], `${a.label || s.assess} · ${t.label}`); load().catch(() => {}); }
    else { toast("Rascunho salvo."); await load(); go("queue"); }
    return r;
  }
  const confirmGrades = () => saveGrades(true);

  // --- Chamada ---
  async function renderAttendance() {
    const s = state.sel;
    if (!turmas().some((x) => x.id === s.class_id)) s.class_id = turmas()[0] && turmas()[0].id;
    const t = turma(s.class_id);
    s.date = s.date || today();
    s.periods = s.periods || (t ? t.periods_per_lesson : 1);
    if (!state.roster[s.class_id]) { try { state.roster[s.class_id] = (await api("roster", { class_id: s.class_id })).alunos; } catch (e) { toast(e.message); state.roster[s.class_id] = []; } }
    const alunos = state.roster[s.class_id];
    const per = h("b", {}, String(s.periods));
    const list = h("div", { class: "list" });
    const update = () => {
      const f = state.absent.size;
      setMain(alunos.length ? `⚡ Lançar chamada · ${f ? f + " falta(s)" : "todos presentes"}` : null, saveAttendance, alunos.length > 0);
    };
    alunos.forEach((a) => {
      const row = h("div", { class: "item student" + (state.absent.has(a.official_name) ? " absent" : ""), onclick: () => {
        haptic(); if (state.absent.has(a.official_name)) state.absent.delete(a.official_name); else state.absent.add(a.official_name);
        row.classList.toggle("absent"); row.querySelector(".mark").textContent = row.classList.contains("absent") ? "F" : "P"; update();
      } }, h("span", { class: "num" }, a.number ?? ""), h("div", { class: "grow name" }, a.official_name), h("span", { class: "mark" }, state.absent.has(a.official_name) ? "F" : "P"));
      list.append(row);
    });
    update();
    return h("div", { class: "fade" },
      h("h2", {}, "Chamada"),
      classChips(s.class_id, (id) => { s.class_id = id; state.absent.clear(); s.periods = null; render(); }),
      h("div", { class: "card row between" },
        h("input", { type: "date", value: s.date, style: "max-width:170px", onchange: (e) => { s.date = e.target.value; } }),
        h("div", { class: "stepper" }, h("span", { class: "muted" }, "tempos"),
          h("button", { onclick: () => { s.periods = Math.max(1, s.periods - 1); per.textContent = s.periods; haptic(); } }, "−"), per,
          h("button", { onclick: () => { s.periods = Math.min(6, s.periods + 1); per.textContent = s.periods; haptic(); } }, "+"))),
      alunos.length ? h("div", {},
        h("div", { class: "row between", style: "margin:6px 4px" }, h("span", { class: "hint" }, "Toque no aluno para marcar falta"),
          h("a", { href: "#", onclick: (e) => { e.preventDefault(); state.absent.clear(); render(); haptic(); } }, "Todos presentes")),
        list)
        : h("div", { class: "card" }, "⚠️ Esta turma ainda não tem lista. ", h("a", { href: "#", onclick: (e) => { e.preventDefault(); openImport(s.class_id); } }, "Importar agora")));
  }
  async function saveAttendance() {
    const s = state.sel; const t = turma(s.class_id); const alunos = state.roster[s.class_id] || [];
    const f = state.absent.size;
    if (!(await confirmDialog(`Chamada de ${fmt(s.date)} — ${t.label}\n${alunos.length - f} presentes, ${f} falta(s), ${s.periods} tempo(s). Confirmar?`))) return;
    const r = await api("save_batch", { kind: "attendance", class_id: s.class_id, occurred_on: s.date, periods: s.periods, confirm: true,
      entries: alunos.map((a) => ({ official_name: a.official_name, present: !state.absent.has(a.official_name) })) });
    notifyH("success"); state.absent.clear(); showLive([r.batch_id], `Chamada · ${t.label}`); load().catch(() => {});
  }

  // --- Diário ---
  function renderContent() {
    const s = state.sel;
    if (!turmas().some((x) => x.id === s.class_id)) s.class_id = turmas()[0] && turmas()[0].id;
    s.date = s.date || today();
    s.allClasses = s.allClasses ?? false;
    const ta = h("textarea", { placeholder: "Conteúdo da aula (dite pelo 🎤 do teclado).\nEx.: Revisão de MRUV e lançamento oblíquo; resolução de exercícios do capítulo 4.", value: s.content || "" });
    const upd = () => setMain(ta.value.trim() ? (s.allClasses ? `Registrar nas ${turmas().length} turmas` : "Registrar conteúdo") : null, saveContent, Boolean(ta.value.trim()));
    ta.addEventListener("input", () => { s.content = ta.value; upd(); });
    upd();
    return h("div", { class: "fade" },
      h("h2", {}, "Diário de classe"),
      classChips(s.class_id, (id) => { s.class_id = id; render(); }),
      h("label", { class: "row", style: "margin:6px 4px" }, h("input", { type: "checkbox", style: "width:auto", checked: s.allClasses, onchange: (e) => { s.allClasses = e.target.checked; upd(); } }), "Mesmo conteúdo em todas as turmas"),
      h("label", { class: "field" }, h("span", {}, "Data da aula"), h("input", { type: "date", value: s.date, onchange: (e) => { s.date = e.target.value; } })),
      h("label", { class: "field" }, h("span", {}, "Conteúdo"), ta));
  }
  async function saveContent() {
    const s = state.sel; const ids = s.allClasses ? turmas().map((t) => t.id) : [s.class_id];
    if (!(await confirmDialog(`Registrar o conteúdo de ${fmt(s.date)} em ${ids.length} turma(s)?`))) return;
    const bids = [];
    for (const id of ids) bids.push((await api("save_batch", { kind: "content", class_id: id, occurred_on: s.date, content_text: s.content, confirm: true })).batch_id);
    notifyH("success"); s.content = ""; showLive(bids, `Diário de ${fmt(s.date)}`); load().catch(() => {});
  }

  // --- Fila ---
  function renderQueue() {
    setMain(null);
    const lst = fila();
    return h("div", { class: "fade" },
      h("h2", {}, `Fila · ${schoolName(state.school)}`),
      h("p", { class: "muted", style: "margin:0 4px 8px" }, "Tudo o que você confirmou. O aviso de conferência chega aqui e no chat."),
      lst.length ? h("div", { class: "list" }, lst.map((b) => {
        const [st, cls] = STATUS[b.status] || [b.status, "info"]; const [ic, kl] = KIND[b.kind] || ["•", b.kind];
        return h("div", { class: "item", onclick: () => openBatch(b.id) },
          h("span", { style: "font-size:22px" }, ic),
          h("div", { class: "grow" }, h("div", { class: "name" }, `${kl}${b.label ? " · " + b.label : ""} — ${b.turma}`),
            h("div", { class: "sub" }, `${fmt(b.occurred_on)} · ${b.kind === "attendance" ? `${b.total} alunos, ${b.faltas} falta(s)` : b.kind === "grade" ? `${b.total} notas` : "conteúdo"}${b.verified_count != null ? ` · ${b.verified_count} conferidos` : ""}`)),
          h("span", { class: `pill ${cls}` }, st));
      })) : h("div", { class: "empty" }, "Nada na fila ainda. Comece pelas Notas ou pela Chamada."));
  }
  async function openBatch(id) {
    haptic();
    state.tab = "batch";
    $view.replaceChildren(h("div", { class: "skeleton" }));
    if (tg) tg.BackButton.show();
    try {
      const d = await api("batch", { batch_id: id }); const b = d.lote;
      const [st, cls] = STATUS[b.status] || [b.status, "info"]; const [ic, kl] = KIND[b.kind] || ["•", b.kind];
      const items = b.kind === "content" ? h("div", { class: "card" }, b.content_text) : h("div", { class: "list" }, d.itens.map((e) => h("div", { class: "item" },
        h("div", { class: "grow name" }, e.official_name),
        b.kind === "grade" ? h("b", {}, e.value == null ? (e.note || "—") : String(e.value).replace(".", ",")) : h("span", { class: `pill ${e.present === false ? "bad" : "ok"}` }, e.present === false ? "falta" : "presente"))));
      $view.replaceChildren(h("div", { class: "fade" },
        h("h2", {}, `${ic} ${kl}${b.label ? " · " + b.label : ""}`),
        h("div", { class: "row", style: "margin:0 4px 6px;gap:8px" }, h("span", { class: "muted" }, `${b.turma} · ${fmt(b.occurred_on)}`), h("span", { class: `pill ${cls}` }, st)),
        b.readback && b.readback.note ? h("div", { class: "card" }, b.readback.note) : null,
        items,
        b.status === "draft" ? h("button", { class: "btn", onclick: async () => { await api("confirm_batch", { batch_id: id }); notifyH("success"); showLive([id], `${kl} · ${b.turma}`); load().catch(() => {}); } }, "⚡ Lançar agora") : null,
        ["confirmed", "dispatched"].includes(b.status) ? h("button", { class: "btn ghost", onclick: () => showLive([id], `${kl} · ${b.turma}`) }, "Acompanhar ao vivo") : null,
        h("button", { class: "btn ghost", onclick: async () => { try { await api("send_csv", { batch_id: id }); notifyH("success"); toast("📄 Planilha enviada no chat."); } catch (e) { toast(e.message); } } }, "📄 Enviar planilha no chat"),
        ["draft", "confirmed"].includes(b.status) ? h("button", { class: "btn danger", onclick: async () => { if (!(await confirmDialog("Cancelar este lote?"))) return; await api("cancel_batch", { batch_id: id }); toast("Cancelado."); await load(); go("queue"); } }, "Cancelar lote") : null));
      setMain(null);
    } catch (e) { toast(e.message); go("queue"); }
  }

  // --- Lançamento ao vivo (sem fila: confirma e acompanha aqui) ---
  const FASE = { preparando: ["⏳", "Preparando…"], conectando: ["🔌", "Conectando ao sistema da escola…"], lancando: ["✍️", "Lançando e conferindo…"],
    processando: ["⚙️", "Processando…"], verified: ["✅", "Conferido no sistema"], partial: ["🟡", "Parcial — veja o que faltou"], failed: ["❌", "Não deu para lançar"],
    bloqueado: ["⏸️", "Bloqueado pela escola — guardado"], tentando_de_novo: ["🔁", "Falha técnica — tentando de novo sozinho"] };
  function showLive(ids, title) {
    state.tab = "live"; setMain(null); window.scrollTo(0, 0);
    if (tg) tg.BackButton.show();
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("on"));
    const token = {}; state.live = token;
    const cards = ids.map((id) => ({ id, el: h("div", { class: "card live" }, h("div", { class: "live-head" }, h("span", { class: "spin" }), h("b", {}, "Preparando…"))) }));
    $view.replaceChildren(h("div", { class: "fade" }, h("h2", {}, "Lançando agora"), h("p", { class: "muted", style: "margin:0 4px 8px" }, title || ""), ...cards.map((c) => c.el),
      h("button", { class: "btn ghost", onclick: () => go("queue") }, "Ver todos os lançamentos")));
    const t0 = Date.now();
    const tick = async () => {
      if (state.live !== token) return;
      let pending = 0;
      for (const c of cards) {
        if (c.done) continue;
        try {
          const d = await api("batch_live", { batch_id: c.id });
          const [ic, label] = FASE[d.fase] || ["•", d.fase];
          const final = ["verified", "partial", "failed", "bloqueado"].includes(d.fase);
          const secs = Math.round((Date.now() - t0) / 1000);
          const kids = [h("div", { class: "live-head" }, final ? h("span", { class: "big" }, ic) : h("span", { class: "spin" }), h("div", { class: "grow" },
            h("b", {}, label), h("div", { class: "sub" }, `${d.turma || ""} · ${SYSTEM[d.sistema] || d.sistema || ""}${final ? ` · ${secs}s` : ` · ${secs}s`}`)),
            d.total ? h("span", { class: `pill ${d.fase === "verified" ? "ok" : final ? "risk" : "info"}` }, `${d.conferidos_n ?? 0}/${d.total}`) : null)];
          if (d.nota && final) kids.push(h("div", { class: "hint" }, d.nota));
          if (d.conferidos && d.conferidos.length) kids.push(h("div", { class: "list mini" }, d.conferidos.map((x) => h("div", { class: "item" },
            h("div", { class: "grow name" }, x.aluno), h("span", { class: "muted" }, x.antes != null && String(x.antes).trim() !== "" && String(x.antes) !== String(x.valor) ? `${x.antes} → ` : ""), h("b", {}, x.valor == null ? "—" : String(x.valor))))));
          const prob = [...(d.divergentes || []), ...(d.problemas || []), ...(d.em_branco || [])];
          if (prob.length) kids.push(h("div", { class: "card warnbox" }, h("b", {}, "Para conferir: "), prob.map((x) => `${x.aluno || ""} (${x.motivo || ("lido " + (x.lido ?? "—"))})`).join(" · ")));
          c.el.replaceChildren(...kids);
          if (final) { c.done = true; notifyH(d.fase === "verified" ? "success" : d.fase === "failed" ? "error" : "warning"); }
          else pending++;
        } catch (e) { pending++; }
      }
      if (pending && Date.now() - t0 < 180000) setTimeout(tick, 1500);
      else if (pending) cards.filter((c) => !c.done).forEach((c) => c.el.append(h("div", { class: "hint" }, "Ainda processando. O resultado chega no chat e na aba Fila.")));
    };
    tick();
  }

  // ---------- módulos (Escola, Finanças, Tarefas, Listas) ----------
  const MODULES = [["escola", "🏫", "Escola"], ["financas", "💰", "Finanças"], ["tarefas", "✅", "Tarefas"], ["listas", "📝", "Listas"]];
  function renderModBar() {
    const bar = document.getElementById("modbar");
    if (!bar) return;
    bar.replaceChildren(...MODULES.map(([k, ic, nm]) => h("button", { class: state.module === k ? "on" : "", onclick: () => pickModule(k) }, h("span", {}, ic), nm)));
  }
  function pickModule(k) {
    if (k === state.module) return;
    haptic(); state.module = k; store.set("jos_modulo", k); state.live = null; setMain(null);
    if (k === "escola") state.tab = "home";
    window.scrollTo(0, 0); render();
  }

  // ---------- navegação ----------
  async function render() {
    renderModBar();
    const esc = state.module === "escola";
    document.getElementById("tabs").hidden = !esc;
    document.body.classList.toggle("notabs", !esc);
    if (!esc) {
      document.getElementById("schoolbar").hidden = true;
      document.getElementById("subtitle").textContent = (MODULES.find((m) => m[0] === state.module) || [])[2] || "";
      if (tg) tg.BackButton.hide();
      if (!state.data) return;
      if (window.JOSHub) $view.replaceChildren(await window.JOSHub.render(state.module));
      return;
    }
    if (state.school) document.getElementById("subtitle").textContent = "Escola · " + schoolName(state.school);
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === state.tab));
    if (tg) (["home", "grades", "attendance", "content", "queue"].includes(state.tab) ? tg.BackButton.hide() : tg.BackButton.show());
    if (!state.data) return;
    renderSchoolBar();
    const v = state.tab === "home" ? renderHome() : state.tab === "grades" ? renderGrades() : state.tab === "attendance" ? await renderAttendance() : state.tab === "content" ? renderContent() : renderQueue();
    $view.replaceChildren(v);
  }
  function go(tab) { state.tab = tab; state.live = null; window.scrollTo(0, 0); render(); }
  async function load() { state.data = await api("bootstrap"); }

  document.getElementById("tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; haptic(); go(b.dataset.tab); });
  document.getElementById("refresh").addEventListener("click", async () => { haptic(); state.roster = {}; try { await load(); render(); toast("Atualizado"); } catch (e) { toast(e.message); } });

  (async function start() {
    if (!tg || !tg.initData) {
      $view.replaceChildren(h("div", { class: "empty" }, h("h2", {}, "Abra pelo Telegram"), h("p", {}, "Este app funciona dentro do bot do Jair OS: toque no botão 🏫 Escola no chat (Escola, Finanças, Tarefas e Listas no mesmo app).")));
      return;
    }
    tg.ready(); tg.expand();
    try { tg.setHeaderColor("secondary_bg_color"); } catch (_) {}
    tg.BackButton.onClick(() => go(state.tab === "batch" || state.tab === "live" ? "queue" : "home"));
    $view.replaceChildren(h("div", { class: "skeleton" }), h("div", { class: "skeleton" }), h("div", { class: "skeleton" }));
    try {
      await load();
      const list = schools();
      const asked = (new URLSearchParams(location.search).get("escola") || (tg.initDataUnsafe && tg.initDataUnsafe.start_param) || "").toLowerCase();
      const saved = store.get("jos_escola");
      pickSchool([asked, saved, list[0]].find((k) => k && list.includes(k)) || null, true);
      const mq = (new URLSearchParams(location.search).get("m") || "").toLowerCase();
      const ms = store.get("jos_modulo");
      state.module = [mq, ms, "escola"].find((k) => k && MODULES.some((m) => m[0] === k));
      render();
    }
    catch (e) { $view.replaceChildren(h("div", { class: "empty" }, h("h2", {}, "Não consegui abrir"), h("p", {}, e.message))); }
  })();
})();
