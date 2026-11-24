/* Jair OS — Finanças, Tarefas e Listas no Mini App do Telegram.
   Ditado pelo 🎤 do teclado ou último áudio do chat; a interpretação é feita no servidor por regras (sem IA, sem custo). */
(() => {
  "use strict";
  const J = () => window.JOS;
  const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const brlS = (v) => Math.abs(Number(v) || 0) >= 1000 ? (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : brl(v);
  const dm = (d) => { const s = String(d).slice(0, 10).split("-"); return `${s[2]}/${s[1]}`; };
  const local = { fin: { month: null, text: "", parsed: null }, task: { text: "" }, list: { id: null, text: "" } };

  function audioButton(onText) {
    const { h, state, haptic, toast } = J();
    const a = state.data && state.data.ultimo_audio;
    if (!a) return null;
    const hhmm = new Date(a.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return h("button", { class: "btn ghost", onclick: () => { haptic(); onText(a.texto); toast("🎙️ Áudio do Telegram carregado"); } }, `🎙️ Usar último áudio (${hhmm})`);
  }

  // ---------------- Finanças ----------------
  async function renderFin() {
    const { h, api, setMain, haptic, notifyH, toast, confirmDialog } = J();
    const f = local.fin;
    let sum;
    try { sum = await api("fin_summary", { month: f.month || undefined }); } catch (e) { return h("div", { class: "empty" }, e.message); }
    f.month = sum.mes;
    const shift = (n) => { const [y, m] = f.month.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); f.month = d.toISOString().slice(0, 7); haptic(); J().rerender(); };
    const ta = h("textarea", { placeholder: "Dite ou digite. Ex.:\nmercado 45,90 no pix; uber 18 ontem\nrecebi 300 de aula particular", value: f.text });
    const interpret = async () => {
      if (!ta.value.trim()) return;
      try { f.parsed = (await api("fin_parse", { text: ta.value })); f.text = ta.value; notifyH("success"); J().rerender(); }
      catch (e) { notifyH("error"); toast(e.message); }
    };
    ta.addEventListener("input", () => { f.text = ta.value; });
    const despesas = sum.por_categoria.filter((c) => c.tipo === "expense");
    const maxCat = Math.max(1, ...despesas.map((c) => c.total));
    const wrap = h("div", { class: "fade" },
      h("div", { class: "row between", style: "margin:6px 2px" },
        h("button", { class: "icon-btn", onclick: () => shift(-1) }, "‹"), h("h2", { style: "margin:0" }, `Finanças · ${sum.mes_label}`), h("button", { class: "icon-btn", onclick: () => shift(1) }, "›")),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("b", { class: "pos money" }, brlS(sum.receitas)), h("span", {}, "entradas")),
        h("div", { class: "stat" }, h("b", { class: "neg money" }, brlS(sum.despesas)), h("span", {}, "gastos")),
        h("div", { class: "stat" }, h("b", { class: (sum.saldo >= 0 ? "pos" : "neg") + " money" }, brlS(sum.saldo)), h("span", {}, "saldo"))),
      h("label", { class: "field" }, h("span", {}, "Novo lançamento"), ta),
      audioButton((t) => { ta.value = t; f.text = t; interpret(); }),
      h("button", { class: "btn", onclick: interpret }, "✨ Interpretar"),
      f.parsed ? renderFinParsed(f) : h("p", { class: "hint" }, "Vários de uma vez: separe por ponto e vírgula ou linha. Datas: hoje, ontem, dia 22, 22/11."),
      despesas.length ? h("h3", {}, "Gastos por categoria") : null,
      despesas.length ? h("div", { class: "list" }, despesas.map((c) => h("div", { class: "item" },
        h("span", { style: "font-size:20px" }, c.icone), h("div", { class: "grow" }, h("div", { class: "row between" }, h("span", { class: "name" }, c.nome), h("b", {}, brl(c.total))),
          h("div", { class: "bar" }, h("i", { style: `width:${Math.round((c.total / maxCat) * 100)}%` })))))) : null,
      h("h3", {}, "Últimos lançamentos"),
      sum.ultimos.length ? h("div", { class: "list" }, sum.ultimos.map((t) => h("div", { class: "item", onclick: async () => {
        if (!(await confirmDialog(`Apagar "${t.description}" (${brl(t.amount)})?`))) return;
        try { await api("fin_delete", { id: t.id }); notifyH("success"); toast("Apagado."); J().rerender(); } catch (e) { toast(e.message); }
      } }, h("span", { style: "font-size:20px" }, t.icon || "•"), h("div", { class: "grow" }, h("div", { class: "name" }, t.description), h("div", { class: "sub" }, `${dm(t.dia)} · ${t.categoria || "—"}${t.payment_method ? " · " + t.payment_method : ""}`)),
        h("b", { class: t.transaction_type === "income" ? "pos" : "neg" }, (t.transaction_type === "income" ? "+ " : "− ") + brl(t.amount)))))
        : h("div", { class: "empty" }, "Nenhum lançamento neste mês."));
    if (!f.parsed) setMain(null);
    return wrap;
  }

  function renderFinParsed(f) {
    const { h, api, setMain, notifyH, toast, haptic } = J();
    const cats = f.parsed.categorias;
    const rows = f.parsed.itens;
    const list = h("div", { class: "list" });
    const refresh = () => {
      const bad = rows.filter((r) => !(Number(r.amount) > 0)).length;
      setMain(bad ? `Falta valor em ${bad} item(ns)` : `💾 Salvar ${rows.length} lançamento(s)`, save, !bad && rows.length > 0);
    };
    const save = async () => {
      const r = await api("fin_add", { items: rows });
      notifyH("success"); toast(`✅ ${r.salvos} lançamento(s) salvo(s)`);
      f.parsed = null; f.text = ""; f.month = null; setMain(null); J().rerender();
    };
    rows.forEach((r, i) => {
      const sel = h("select", { onchange: (e) => { r.category = e.target.value; const c = cats.find((x) => x.slug === r.category); if (c) r.type = c.kind === "income" ? "income" : "expense"; haptic(); paint(); refresh(); } },
        ...cats.map((c) => h("option", { value: c.slug, selected: c.slug === r.category }, `${c.icon || ""} ${c.name}${c.kind === "income" ? " (entrada)" : ""}`)));
      const amt = h("input", { class: "val", inputmode: "decimal", value: r.amount == null ? "" : String(r.amount).replace(".", ","), placeholder: "R$", oninput: (e) => { r.amount = Number(String(e.target.value).replace(/\./g, "").replace(",", ".")); refresh(); } });
      const desc = h("input", { value: r.description, oninput: (e) => { r.description = e.target.value; } });
      const date = h("input", { type: "date", value: r.date, onchange: (e) => { r.date = e.target.value; } });
      const kind = h("button", { class: "chip" }, "");
      const paint = () => { kind.textContent = r.type === "income" ? "＋ entrada" : "− gasto"; kind.className = "chip " + (r.type === "income" ? "on" : ""); };
      kind.onclick = () => { r.type = r.type === "income" ? "expense" : "income"; haptic(); paint(); };
      paint();
      list.append(h("div", { class: "item" }, h("div", { class: "fin-item" },
        h("div", { class: "r1" }, desc, h("button", { class: "icon-btn", title: "remover", onclick: () => { rows.splice(i, 1); haptic(); J().rerender(); } }, "✕")),
        h("div", { class: "r2" }, kind, date, amt), sel)));
    });
    refresh();
    return h("div", {}, h("h3", {}, "Confira e salve"), list);
  }

  // ---------------- Tarefas ----------------
  async function renderTasks() {
    const { h, api, setMain, haptic, notifyH, toast, confirmDialog, tg } = J();
    const T = local.task;
    let d;
    try { d = await api("task_list"); } catch (e) { return h("div", { class: "empty" }, e.message); }
    const ta = h("textarea", { style: "min-height:72px", placeholder: "Nova tarefa (dite). Ex.: ligar para a coordenação amanhã às 15h urgente\nVárias: uma por linha", value: T.text });
    const add = async () => {
      if (!ta.value.trim()) return;
      const r = await api("task_add", { text: ta.value });
      notifyH("success"); toast(`✅ ${r.criadas.length} tarefa(s) criada(s)`); T.text = ""; setMain(null); J().rerender();
    };
    ta.addEventListener("input", () => { T.text = ta.value; setMain(ta.value.trim() ? "➕ Adicionar tarefa" : null, add, true); });
    setMain(T.text.trim() ? "➕ Adicionar tarefa" : null, add, true);
    const now = new Date(); const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    const groups = [["⏰ Atrasadas", []], ["📅 Hoje", []], ["🗓️ Próximas", []], ["📥 Sem data", []]];
    d.tarefas.forEach((t) => {
      const due = t.due_at ? new Date(t.due_at) : null;
      (due ? (due < now && due.toDateString() !== now.toDateString() ? groups[0] : due <= endToday ? groups[1] : groups[2]) : groups[3])[1].push(t);
    });
    const item = (t) => {
      const row = h("div", { class: "item task" });
      const due = t.due_at ? new Date(t.due_at) : null;
      const circle = h("button", { class: "check", onclick: async (e) => {
        e.stopPropagation(); haptic("medium"); row.classList.add("done");
        try { await api("task_set", { id: t.id, status: "done" }); notifyH("success"); setTimeout(() => row.remove(), 350); } catch (er) { row.classList.remove("done"); toast(er.message); }
      } }, "");
      row.append(circle, h("div", { class: "grow", onclick: async () => {
        const pick = await new Promise((res) => tg && tg.showPopup ? tg.showPopup({ title: "Tarefa", message: t.title.slice(0, 200), buttons: [{ id: "amanha", type: "default", text: "Adiar para amanhã" }, { id: "cancel", type: "destructive", text: "Cancelar tarefa" }, { type: "close" }] }, res)
          : res(window.confirm("Adiar para amanhã?") ? "amanha" : null));
        try {
          if (pick === "amanha") { await api("task_set", { id: t.id, due_text: "amanhã" }); toast("Adiada para amanhã"); J().rerender(); }
          if (pick === "cancel" && (await confirmDialog("Cancelar esta tarefa?"))) { await api("task_set", { id: t.id, status: "cancelled" }); toast("Cancelada"); J().rerender(); }
        } catch (er) { toast(er.message); }
      } }, h("div", { class: "name", style: "white-space:normal" }, t.title),
        h("div", { class: "sub" }, [due ? due.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null,
          t.priority >= 4 ? "🔴 urgente" : t.priority === 3 ? "🟠 importante" : null, t.source_type === "telegram_escola" ? "🏫 escola" : null].filter(Boolean).join(" · "))));
      return row;
    };
    return h("div", { class: "fade" },
      h("h2", {}, "Tarefas"),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("b", {}, d.contagem.abertas), h("span", {}, "abertas")),
        h("div", { class: "stat" }, h("b", { class: d.contagem.atrasadas ? "neg" : "" }, d.contagem.atrasadas), h("span", {}, "atrasadas")),
        h("div", { class: "stat" }, h("b", { class: "pos" }, d.contagem.feitas_7d), h("span", {}, "feitas (7 dias)"))),
      h("label", { class: "field" }, ta),
      audioButton((t) => { ta.value = t; T.text = t; setMain("➕ Adicionar tarefa", add, true); }),
      h("p", { class: "hint" }, "Toque no círculo para concluir. Toque na tarefa para adiar ou cancelar."),
      ...groups.filter(([, l]) => l.length).map(([nm, l]) => h("div", {}, h("h3", {}, `${nm} · ${l.length}`), h("div", { class: "list" }, l.map(item)))),
      d.tarefas.length ? null : h("div", { class: "empty" }, "Nenhuma tarefa aberta. 🎉"));
  }

  // ---------------- Listas ----------------
  async function renderLists() {
    const { h, api, setMain, haptic, notifyH, toast, confirmDialog, store } = J();
    const L = local.list;
    let ls;
    try { ls = await api("lists"); } catch (e) { return h("div", { class: "empty" }, e.message); }
    if (!L.id || !ls.listas.some((x) => x.id === L.id)) L.id = store.get("jos_lista") || (ls.listas[0] && ls.listas[0].id);
    if (!ls.listas.some((x) => x.id === L.id)) L.id = ls.listas[0] && ls.listas[0].id;
    const chips = h("div", { class: "chips" }, ls.listas.map((l) => h("button", { class: "chip" + (l.id === L.id ? " on" : ""), onclick: () => { haptic(); L.id = l.id; store.set("jos_lista", l.id); J().rerender(); } },
      `${l.icon || "📝"} ${l.name}`, l.abertos ? h("small", {}, String(l.abertos)) : null)),
      h("button", { class: "chip", onclick: () => { haptic(); L.creating = !L.creating; J().rerender(); } }, "＋ nova"));
    const creator = L.creating ? (() => {
      const inp = h("input", { placeholder: "Nome da lista (ex.: Farmácia, Viagem, Material de aula)" });
      return h("div", { class: "card row", style: "gap:8px" }, inp, h("button", { class: "btn", style: "width:auto;margin:0", onclick: async () => {
        const name = inp.value.trim(); if (!name) return;
        try { const r = await api("list_create", { name }); L.id = r.lista.id; L.creating = false; store.set("jos_lista", L.id); notifyH("success"); J().rerender(); } catch (e) { toast(e.message); }
      } }, "Criar"));
    })() : null;
    if (!L.id) return h("div", { class: "fade" }, h("h2", {}, "Listas"), chips, creator);
    const d = await api("list_items", { list_id: L.id });
    const ta = h("textarea", { style: "min-height:64px", placeholder: "Adicionar itens (dite): arroz, 2 kg de feijão, 3 leites e café", value: L.text });
    const add = async () => {
      if (!ta.value.trim()) return;
      const r = await api("list_add", { list_id: L.id, text: ta.value });
      notifyH("success"); toast(`✅ ${r.adicionados} item(ns)`); L.text = ""; setMain(null); J().rerender();
    };
    ta.addEventListener("input", () => { L.text = ta.value; setMain(ta.value.trim() ? "➕ Adicionar à lista" : null, add, true); });
    setMain(L.text.trim() ? "➕ Adicionar à lista" : null, add, true);
    const abertos = d.itens.filter((i) => !i.done), feitos = d.itens.filter((i) => i.done);
    const row = (i) => {
      const el = h("div", { class: "item task" + (i.done ? " done" : ""), onclick: async () => {
        haptic(); el.classList.toggle("done");
        try { await api("list_toggle", { item_id: i.id }); J().rerender(); } catch (e) { el.classList.toggle("done"); toast(e.message); }
      } }, h("span", { class: "check" }, ""), h("div", { class: "grow name", style: "white-space:normal" }, i.text), i.qty ? h("span", { class: "pill info" }, i.qty) : null);
      return el;
    };
    return h("div", { class: "fade" },
      h("h2", {}, `${d.lista.icon || "📝"} ${d.lista.name}`), chips, creator,
      h("label", { class: "field" }, ta),
      audioButton((t) => { ta.value = t; L.text = t; setMain("➕ Adicionar à lista", add, true); }),
      abertos.length ? h("div", { class: "list" }, abertos.map(row)) : h("div", { class: "empty" }, "Lista vazia."),
      feitos.length ? h("h3", {}, `Concluídos · ${feitos.length}`) : null,
      feitos.length ? h("div", { class: "list" }, feitos.map(row)) : null,
      feitos.length ? h("button", { class: "btn ghost", onclick: async () => {
        if (!(await confirmDialog("Remover os itens concluídos?"))) return;
        await api("list_clear_done", { list_id: L.id }); toast("Limpo."); J().rerender();
      } }, "Limpar concluídos") : null);
  }

  window.JOSHub = {
    async render(mod) {
      const { h } = J();
      try {
        if (mod === "financas") return await renderFin();
        if (mod === "tarefas") return await renderTasks();
        if (mod === "listas") return await renderLists();
      } catch (e) { return h("div", { class: "empty" }, h("h2", {}, "Ops"), h("p", {}, e.message)); }
      return h("div", { class: "empty" }, "Módulo desconhecido.");
    },
  };
})();
