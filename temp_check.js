
const SUPABASE_URL = 'https://ejxdsnfoqfjivqquqfri.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqeGRzbmZvcWZqaXZxcXVxZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTU2MTUsImV4cCI6MjA5MDM3MTYxNX0.GIFL4-ZawJXjii2-grilFwMtcrJY9bW24AImpqdteiE'
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

let currentUser = null, currentProfile = null
let allExposicoes = [], allUnidades = [], allUsuarios = [], allColaboradores = [], allEspacos = []
let arquivoDados = [] // Garantir que a variável exista
let editingExpId = null, editingColabId = null, editingUnitId = null
let editingEquipe = {} // { papel: [{ id, nome }] }
let editingUnitSpaces = []
let editingUnitRepo = []

// Helper robusto para buscar exposição (memória ou banco)
async function getExposicao(id) {
  if (!id) return null
  // Buscar no estado global ou no arquivo morto se existir
  let e = allExposicoes.find(x => x.id == id)
  if (!e && typeof arquivoDados !== 'undefined') {
    e = arquivoDados.find(x => x.id == id)
  }
  
  if (!e) {
    const q = '*, unidades(nome), unidade_espacos(nome), exposicao_assistentes(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))'
    const { data, error } = await db.from('exposicoes').select(q).eq('id', id).single()
    if (!error && data) e = data
  }
  return e
}

let appInitialized = false;

async function init() {
  const { data: { session } } = await db.auth.getSession()
  if (session) await onLogin(session.user)
  
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      // Evita o recarregamento pesado se o usuário já estiver logado
      if (!currentUser || currentUser.id !== session?.user?.id || !appInitialized) {
        await onLogin(session.user)
      }
    }
    if (event === 'SIGNED_OUT') onLogout()
  })
}

// Listener para quando a aba voltar a ficar ativa
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && currentUser) {
    // Checa silenciosamente se a sessão ainda existe sem recarregar tudo
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      onLogout();
    }
  }
});


// ── TOUR INTERATIVO PREMIUM ──
async function startTour() {
  const tour = introJs();
  
  // Função auxiliar para mudar de aba programaticamente
  const goToTab = (pageId) => {
    const navItem = document.querySelector(`nav .nav-item[data-page="${pageId}"]`);
    if (navItem) navItem.click();
  };

  tour.setOptions({
    nextLabel: 'Próximo →',
    prevLabel: '← Voltar',
    skipLabel: 'Pular',
    doneLabel: 'Concluir',
    showProgress: true,
    showBullets: true,
    exitOnOverlayClick: false,
    scrollToElement: false,
    disableInteraction: false,
    steps: [
      {
        title: 'Bem-vindo ao SESC Exposições',
        intro: 'Este é o novo cérebro estratégico das nossas mostras. Vamos conhecer como tudo se conecta?'
      },
      {
        element: document.getElementById('kpi-grid'),
        title: 'Painel Estratégico',
        intro: 'Aqui você tem a visão macro: orçamentos globais e volume de projetos. Decisões baseadas em números reais.'
      },
      {
        element: document.querySelector('nav'),
        title: 'Navegação de Módulos',
        intro: 'Cada aba guarda uma dimensão do projeto. Vamos navegar por elas agora.'
      },
      {
        element: document.getElementById('timeline-container'),
        title: 'Timeline & Planejamento',
        intro: 'Aqui o tempo ganha forma. Visualize ocupações simultâneas e planeje 2026/2027 com precisão.',
        page: 'timeline'
      },
      {
        element: document.getElementById('colaboradores-container'),
        title: 'Banco de Talentos',
        intro: 'Todos os nossos curadores, produtores e empresas parceiras centralizados aqui.',
        page: 'colaboradores'
      },
      {
        element: document.getElementById('unidades-container'),
        title: 'Infraestrutura',
        intro: 'Conheça cada unidade, seus espaços físicos e repositórios de plantas e arquivos.',
        page: 'unidades'
      },
      {
        element: document.getElementById('arquivo-container'),
        title: 'Memória e História',
        intro: 'Nada se perde. Consulte exposições encerradas para referências e estatísticas passadas.',
        page: 'arquivo'
      },
      {
        title: 'O Sucesso depende de VOCÊ',
        intro: `
          <div style="text-align:center; padding:10px;">
            <div style="font-size:50px; margin-bottom:15px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1));">🤝</div>
            <p style="font-family:'Fraunces', serif; font-size:20px; color:var(--accent2); margin-bottom:12px;">Engajamento é a Chave</p>
            <p style="font-size:14px; line-height:1.6; color:var(--text);">Este app só terá visibilidade e inteligência se cada setor mantiver seus <b>dados atualizados</b>.</p>
            <div style="margin-top:20px; padding:12px; background:var(--bg); border-radius:8px; font-size:12px; font-weight:500; color:var(--accent);">
               Sua participação é o motor que move esta ferramenta!
            </div>
          </div>
        `
      }
    ]
  });

  // Lógica para mudar de página antes de mostrar o passo
  tour.onbeforechange(function(targetElement) {
    const step = this._options.steps[this._currentStep];
    if (step && step.page) {
      goToTab(step.page);
    } else if (this._currentStep === 0 || this._currentStep === 1 || this._currentStep === 2) {
      goToTab('visao-geral');
    }
  });

  tour.start();
}



async function onLogin(user) {
  currentUser = user
  let { data: profile, error: fetchErr } = await db.from('usuarios').select('*').eq('id', user.id).single()
  
  // Se o perfil não existe, vamos criá-lo automaticamente
  if (!profile || fetchErr) {
    console.log("Perfil não encontrado, criando novo perfil para:", user.email);
    const { data: newProfile, error: insErr } = await db.from('usuarios').insert({
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.full_name || user.email.split('@')[0],
      perfil: 'gestor' // Define como gestor para garantir seu acesso
    }).select().single();
    
    if (!insErr) profile = newProfile;
    else console.error("Erro ao criar perfil:", insErr);
  }

  currentProfile = profile
  
  // Atualizar último acesso
  await db.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('id', user.id)

  document.getElementById('login-screen').style.display = 'none'
  document.getElementById('app').style.display = 'block'
  document.getElementById('user-badge').textContent = profile?.nome || user.email
  document.getElementById('ano-atual').textContent = new Date().getFullYear()
  const userPerfil = (profile?.perfil || '').toLowerCase();
  if (userPerfil !== 'gestor') {
    console.log('Acesso Admin negado para perfil:', profile?.perfil);
    document.getElementById('nav-admin').style.display = 'none';
  } else {
    document.getElementById('nav-admin').style.display = 'flex';
  }
  await loadBaseData()
  await loadExposicoes()
  appInitialized = true;
}

function onLogout() {
  document.getElementById('app').style.display = 'none'
  document.getElementById('login-screen').style.display = 'flex'
}

document.addEventListener('DOMContentLoaded', () => {
  const btnTour = document.getElementById('btn-tour')
  if (btnTour) btnTour.addEventListener('click', startTour)

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim()
    const pass  = document.getElementById('login-password').value
    const btn = document.getElementById('btn-login')
    const err = document.getElementById('login-error')
    if (!email || !pass) { err.textContent = 'Preencha todos os campos.'; err.style.display = 'block'; return }
    btn.disabled = true; btn.textContent = 'Entrando...'; err.style.display = 'none'
    const { error } = await db.auth.signInWithPassword({ email, password: pass })
    if (error) { err.textContent = 'Email ou senha incorretos.'; err.style.display = 'block' }
    btn.disabled = false; btn.textContent = 'Entrar'
  })

  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click() })
  document.getElementById('btn-logout').addEventListener('click', () => db.auth.signOut())

  document.querySelectorAll('nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page')
      document.querySelectorAll('nav .nav-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      document.querySelectorAll('main .page').forEach(p => p.classList.remove('active'))
      document.getElementById('page-' + page).classList.add('active')
      if (page === 'visao-geral') loadExposicoes()
      if (page === 'timeline') loadTimeline()
      if (page === 'colaboradores') loadColaboradores()
      if (page === 'educativo') loadEducativo()
      if (page === 'unidades') loadUnidades()
      if (page === 'arquivo') loadArquivo()
      if (page === 'aberturas') loadAberturas()
      if (page === 'admin') loadAdmin()
      
      const isCons = currentProfile?.perfil === 'consultor'
      const btnNovo = document.getElementById('btn-abrir-modal-novo')
      if (btnNovo) btnNovo.style.display = isCons ? 'none' : 'block'
    })
  })

  // Listeners do Multiselect Status
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ms-status')) {
      const content = document.getElementById('ms-status-content')
      if (content) content.classList.remove('open')
    }
  })

  const msBtn = document.getElementById('ms-status-btn')
  if (msBtn) {
    msBtn.onclick = () => {
      document.getElementById('ms-status-content').classList.toggle('open')
    }
  }

  document.querySelectorAll('.status-chk').forEach(chk => {
    chk.onchange = () => {
      updateStatusBtnLabel()
      loadExposicoes()
    }
  })

  window.msSelectAll = () => {
    document.querySelectorAll('.status-chk').forEach(c => c.checked = true)
    updateStatusBtnLabel()
    loadExposicoes()
  }
  window.msClear = () => {
    document.querySelectorAll('.status-chk').forEach(c => c.checked = false)
    updateStatusBtnLabel()
    loadExposicoes()
  }
})


function updateStatusBtnLabel() {
  const checked = Array.from(document.querySelectorAll('.status-chk:checked'))
  const btn = document.getElementById('ms-status-btn')
  if (!btn) return
  if (checked.length === 0) btn.textContent = 'Todos os status'
  else if (checked.length === 1) btn.textContent = checked[0].value
  else btn.textContent = checked.length + ' selecionados'
}

async function loadBaseData() {
  const [{ data: unidades, error: uErr }, { data: usuarios }, { data: colabs }, { data: espacos }] = await Promise.all([
    db.from('unidades').select('*').order('nome'),
    db.from('usuarios').select('*').order('nome'),
    db.from('colaboradores').select('id, nome, funcao').order('nome'),
    db.from('unidade_espacos').select('*').order('nome')
  ])
  if(uErr) console.error('Error loading units:', uErr)
  allUnidades = unidades || []
  allUsuarios = usuarios || []
  allColaboradores = colabs || []
  allEspacos = espacos || []
  
  const fu = document.getElementById('filter-unidade')
  fu.innerHTML = '<option value="">Todas as unidades</option>'
  allUnidades.forEach(u => fu.innerHTML += `<option value="${u.id}">${u.nome}</option>`)
  const fa = document.getElementById('filter-assistente')
  fa.innerHTML = '<option value="">Todos os assistentes</option>'
  allUsuarios.forEach(u => fa.innerHTML += `<option value="${u.id}">${u.nome}</option>`)
  const su = document.getElementById('f-unidade')
  su.innerHTML = '<option value="">— Selecione —</option>'
  allUnidades.forEach(u => su.innerHTML += `<option value="${u.id}">${u.nome}</option>`)
  
  const acb = document.getElementById('assistentes-checkboxes');
  if(acb) {
    acb.innerHTML = '';
    allUsuarios.forEach(u => acb.innerHTML += `<label style="display:flex; align-items:center; gap:4px; font-size:13px; cursor:pointer"><input type="checkbox" class="chk-assistente" id="chk-ast-${u.id}" value="${u.id}"> ${u.nome}</label>`);
  }

  // Listener para filtrar espaços quando mudar unidade no modal de expo
  document.getElementById('f-unidade').addEventListener('change', (e) => updateEspacoDropdown(e.target.value))
}

function updateEspacoDropdown(unitId, selectedId = null) {
  const sel = document.getElementById('f-espaco')
  if (!unitId) { sel.innerHTML = '<option value="">— Selecione a unidade —</option>'; return }
  const filtered = allEspacos.filter(s => s.unidade_id === unitId)
  if (!filtered.length) { sel.innerHTML = '<option value="">Sem espaços cadastrados</option>'; return }
  sel.innerHTML = '<option value="">— Selecione o espaço —</option>' + 
    filtered.map(s => `<option value="${s.id}" ${s.id===selectedId?'selected':''}>${s.nome} (${s.metragem}m²)</option>`).join('')
}

async function loadExposicoes() {
  const anoAtual = new Date().getFullYear()
  const assistente = document.getElementById('filter-assistente').value
  
  let queryStr = assistente 
    ? '*, unidades(nome), unidade_espacos(nome), exposicao_assistentes!inner(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))'
    : '*, unidades(nome), unidade_espacos(nome), exposicao_assistentes(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))'

  let q = db.from('exposicoes').select(queryStr).eq('ano', anoAtual).order('data_abertura')
  if (assistente) q = q.eq('exposicao_assistentes.usuario_id', assistente)

  const unidade = document.getElementById('filter-unidade').value
  if (unidade) q = q.eq('unidade_id', unidade)
  
  const selectedStatus = Array.from(document.querySelectorAll('.status-chk:checked')).map(c => c.value)
  if (selectedStatus.length > 0) q = q.in('status', selectedStatus)

  const semestre = document.getElementById('filter-semestre').value
  if (semestre) q = q.eq('semestre', semestre)

  const { data, error } = await q;
  if (error) { console.error(error); return }
  allExposicoes = data || []
  renderCards(allExposicoes)
  renderKPIs(allExposicoes)
}

function renderKPIs(list) {
  const hoje = new Date()
  const em60dias = new Date(); em60dias.setDate(hoje.getDate() + 60)
  const ativos = ['Aberta','Em produção','Em aprovação','Em tratativas']
  const ativas = list.filter(e => ativos.includes(e.status))
  const proximas = list.filter(e => {
    if (!e.data_abertura) return false
    const d = new Date(e.data_abertura + 'T00:00:00')
    return d >= hoje && d <= em60dias
  })
  const orcTotal = list.reduce((s, e) => s + (parseFloat(e.valor_estimado) || 0), 0)

  document.getElementById('kpi-total').textContent = list.length
  document.getElementById('kpi-total-sub').textContent = `no ano de ${new Date().getFullYear()}`
  document.getElementById('kpi-ativas').textContent = ativas.length
  const statusCount = {}
  ativas.forEach(e => statusCount[e.status] = (statusCount[e.status]||0)+1)
  document.getElementById('kpi-ativas-sub').textContent = Object.entries(statusCount).map(([k,v])=>`${v} ${k}`).join(' · ')
  const isSec = currentProfile?.perfil === 'secretaria'
  if (isSec) {
    document.getElementById('kpi-orcamento').textContent = 'Restrito'
    document.getElementById('kpi-orcamento').style.fontSize = '18px'
    document.getElementById('kpi-orcamento-sub').textContent = 'Acesso administrativo necessário'
  } else {
    document.getElementById('kpi-orcamento').textContent = orcTotal ? fmtMoney(orcTotal) : '—'
    document.getElementById('kpi-orcamento').style.fontSize = ''
    document.getElementById('kpi-orcamento-sub').textContent = orcTotal ? `em ${list.filter(e=>e.valor_estimado).length} exposições` : 'Sem valores cadastrados'
  }
  document.getElementById('kpi-proximas').textContent = proximas.length
  document.getElementById('kpi-proximas-sub').textContent = proximas.length ? proximas.slice(0,2).map(e=>e.titulo).join(', ') + (proximas.length > 2 ? '…' : '') : 'Nenhuma nos próximos 60 dias'
  
  renderDashboardCharts(list)
}

function renderDashboardCharts(list) {
  const container = document.getElementById('cards-container')
  const existingCharts = document.getElementById('dash-charts-section')
  if (existingCharts) existingCharts.remove()

  const chartSection = document.createElement('div')
  chartSection.id = 'dash-charts-section'
  chartSection.className = 'dash-row'
  
  // 1. Carga por Assistente (G.E.A.V.T) - Top 6
  const assistantCount = {}
  list.forEach(e => {
    (e.exposicao_assistentes || []).forEach(a => {
      const u = allUsuarios.find(user => user.id === a.usuario_id)
      const nome = u ? u.nome : 'Outros'
      assistantCount[nome] = (assistantCount[nome]||0) + 1
    })
  })
  const sortedAssistants = Object.entries(assistantCount).sort((a,b) => b[1] - a[1]).slice(0, 6)
  const maxAst = sortedAssistants[0]?.[1] || 1
  
  const assistantHtml = sortedAssistants.map(([nome, count]) => `
    <div class="simple-bar-row">
      <div class="simple-bar-label" title="${nome}">${nome}</div>
      <div class="simple-bar-bg"><div class="simple-bar-fill" style="width:${(count/maxAst)*100}%"></div></div>
      <div class="simple-bar-value">${count}</div>
    </div>
  `).join('')

  // 2. Equilíbrio de Rede (Capital vs Interior)
  const regionCount = { 'Capital': 0, 'Interior': 0 }
  list.forEach(e => {
    if (e.capital_interior === 'Capital') regionCount['Capital']++
    else regionCount['Interior']++ // Considera o restante como Interior, conforme regra de negócio
  })
  const totalReg = list.length || 1
  const regionHtml = Object.entries(regionCount).map(([reg, count]) => `
    <div class="simple-bar-row">
      <div class="simple-bar-label">${reg}</div>
      <div class="simple-bar-bg"><div class="simple-bar-fill" style="width:${(count/totalReg)*100}%; background: ${reg==='Capital'?'#1e293b':'#b45309'}"></div></div>
      <div class="simple-bar-value">${Math.round((count/totalReg)*100)}%</div>
    </div>
  `).join('')

  chartSection.innerHTML = `
    <div class="dash-card">
      <div class="dash-title">Carga G.E.A.V.T <span style="font-weight:400; font-size:10px; opacity:0.6">Projetos por Pessoa</span></div>
      ${assistantHtml || '<p class="vazio">Sem dados registrados</p>'}
    </div>
    <div class="dash-card">
      <div class="dash-title">Equilíbrio de Rede <span style="font-weight:400; font-size:10px; opacity:0.6">Capital vs Interior</span></div>
      <div style="margin-top:20px">${regionHtml}</div>
      <div style="margin-top:20px; font-size:11px; color:var(--muted); line-height:1.4">
        Total de <strong>${list.length}</strong> exposições ativas no portfólio.
      </div>
    </div>
  `
  container.parentNode.insertBefore(chartSection, container)
}

function sc(s) { return 's-' + (s||'').replace(/\s/g,'_') }
function bc(s) { return 'bar-' + (s||'').replace(/\s/g,'_') }

function getEquipeCardText(e) {
  if (!e.exposicao_colaboradores || !e.exposicao_colaboradores.length) return ``;
  const names = [];
  ['Curador(a)', 'Produção', 'Arquiteto(a)', 'Educativo'].forEach(papel => {
    e.exposicao_colaboradores.filter(x => x.papel === papel && x.colaboradores).forEach(x => {
      if(names.length < 3 && !names.includes(x.colaboradores.nome)) names.push(x.colaboradores.nome);
    });
  });
  if (names.length) return '👥 ' + names.join(', ') + (e.exposicao_colaboradores.length > names.length ? '...' : '');
  return ``;
}

function getAssistenteNomes(e) {
  if (!e.exposicao_assistentes || !e.exposicao_assistentes.length) return '—';
  const nomesArr = e.exposicao_assistentes.map(x => {
     const u = allUsuarios.find(user => user.id === x.usuario_id);
     return u ? u.nome : null;
  }).filter(Boolean);
  return nomesArr.length ? nomesArr.join(', ') : '—';
}

function getStatusPct(status) {
  const map = { 'Em tratativas': 5, 'Em aprovação': 15, 'Em produção': 55, 'Aberta': 90, 'Encerrada': 100, 'Cancelada': 0, 'Suspensa': 0, 'Postergada': 0 }
  return map[status] ?? 0
}

function renderCards(list) {
  const c = document.getElementById('cards-container')
  if (!list.length) {
    c.innerHTML = `<div class="empty-state"><p>Nenhuma exposição encontrada <a href="javascript:openExpModal()">Adicionar a primeira</a></p></div>`
    return
  }
  c.innerHTML = list.map(e => {
    const pct = getStatusPct(e.status)
    return `
    <div class="card" onclick="openPainel('${e.id}')">
      <div class="card-status-bar ${bc(e.status)}"></div>
      <div class="card-unidade">${e.unidades?.nome || 'Sem unidade'}</div>
      <div class="card-titulo">${e.titulo}</div>
      <div class="card-meta">
        <span class="tag ${sc(e.status)}">${e.status||'—'}</span>
        ${e.semestre ? `<span class="tag">${e.semestre}</span>` : ''}
        ${e.capital_interior ? `<span class="tag">${e.capital_interior}</span>` : ''}
      </div>
      <div class="card-datas">📅 ${e.data_abertura ? fmtDate(e.data_abertura) : (e.periodo_previsto||'—')}${e.data_encerramento ? ' → '+fmtDate(e.data_encerramento) : ''}</div>
      <div class="card-info" style="margin-top:6px;font-size:11px;color:var(--primary);font-weight:600">👤 Assistentes: ${getAssistenteNomes(e)}</div>
      ${getEquipeCardText(e) ? `<div class="card-info" style="margin-top:2px;font-size:11px;opacity:0.8">${getEquipeCardText(e)}</div>` : ''}
      ${pct > 0 ? `<div class="card-progress"><div class="card-progress-bar"><div class="card-progress-fill" style="width:${pct}%"></div></div><div class="card-progress-label">${pct}% concluído</div></div>` : ''}
    </div>`
  }).join('')
}

  ['search','filter-unidade','filter-assistente','filter-semestre'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('input', () => {
      const s  = document.getElementById('search').value.toLowerCase()
      const u  = document.getElementById('filter-unidade').value
      const a  = document.getElementById('filter-assistente').value
      const sm = document.getElementById('filter-semestre').value
      
      const stArr = Array.from(document.querySelectorAll('.status-chk:checked')).map(c => c.value)

      renderCards(allExposicoes.filter(e =>
        (!s  || e.titulo.toLowerCase().includes(s)) &&
        (stArr.length === 0 || stArr.includes(e.status)) && 
        (!u  || e.unidade_id === u) &&
        (!a  || (e.exposicao_assistentes||[]).some(x => x.usuario_id === a)) &&
        (!sm || e.semestre === sm)
      ))
    })
  })

// Listeners Unidades
document.getElementById('btn-nova-unidade').addEventListener('click', () => openUnitModal())
document.getElementById('modal-unit-close').addEventListener('click', closeUnitModal)
document.getElementById('modal-unit-cancel').addEventListener('click', closeUnitModal)
document.getElementById('modal-unit-save').addEventListener('click', saveUnidade)
document.getElementById('modal-unit-delete').addEventListener('click', deleteUnidade)
document.getElementById('btn-add-espaco').addEventListener('click', addUnitSpace)
document.getElementById('search-unidade').addEventListener('input', loadUnidades)

document.getElementById('btn-nova-exposicao').addEventListener('click', () => {
  openExpModal()
  updateEspacoDropdown(null)
})
document.getElementById('modal-exp-close').addEventListener('click', closeExpModal)
document.getElementById('modal-exp-cancel').addEventListener('click', closeExpModal)
document.getElementById('modal-exp-save').addEventListener('click', saveExposicao)
document.getElementById('modal-exp-delete').addEventListener('click', deleteExposicao)

const PAPEIS = ['Curador(a)','Produção','Arquiteto(a)','Designer','Iluminação','Educativo','Acessibilidade','Empresa de Cenotecnia','Empresa de Transporte','Empresa de Iluminação','Empresa de Audiovisual','Empresa de Comunicação Visual']

async function openExpModal(id = null) {
  try {
    editingExpId = id
    document.getElementById('modal-exp-title').textContent = id ? 'Editar Exposição' : 'Nova Exposição'
    document.getElementById('modal-exp-delete').style.display = id ? 'block' : 'none'
    const fields = {
      'titulo':'','unidade':'','status':'Em tratativas','semestre':'',
      'abertura':'','encerramento':'','periodo':'','capital':'',
      'ano': new Date().getFullYear(),'valor':'',
      'cache-curadoria':'', 'valor-cenotecnia':'',
      'cont-producao':'', 'cont-arquitetura':'', 'cont-educativo':'', 'acessibilidade':'',
      'sinopse':'','notas':'','links':'','historico':'',
      'visitas-expo-meta':'','visitas-expo-estat':'','visitas-med-meta':'','visitas-med-estat':'',
      'edu-estagiarios':'','edu-facilitador1':'','edu-facilitador2':'','edu-educador-social':'','edu-asa':''
    }
    editingEquipe = {}
    PAPEIS.forEach(p => editingEquipe[p] = [])
    document.querySelectorAll('.chk-assistente').forEach(c => c.checked = false)

    if (id) {
      const e = await getExposicao(id)
      if (e) {
        Object.assign(fields, {
          'titulo': e.titulo, 'unidade': e.unidade_id||'',
          'status': e.status, 'semestre': e.semestre||'', 'abertura': e.data_abertura||'',
          'encerramento': e.data_encerramento||'', 'periodo': e.periodo_previsto||'',
          'capital': e.capital_interior||'', 'ano': e.ano, 'valor': e.valor_estimado||'',
          'cache-curadoria': e.cache_curadoria||'', 'valor-cenotecnia': e.valor_cenotecnia||'',
          'cont-producao': e.contrato_producao||'', 'cont-arquitetura': e.contrato_arquitetura||'',
          'cont-educativo': e.contrato_educativo||'', 'acessibilidade': e.acessibilidade||'',
          'sinopse': e.sinopse||'', 'notas': e.notas_adicionais||'',
          'links': e.referencias_links||'', 'historico': e.historico_abertura||'',
          'visitas-expo-meta': e.visitas_expo_meta||'',
          'visitas-expo-estat': e.visitas_expo_estatistico||'',
          'visitas-med-meta': e.visitas_mediadas_meta||'',
          'visitas-med-estat': e.visitas_mediadas_estatistico||'',
          'edu-estagiarios': e.edu_estagiarios||'',
          'edu-facilitador1': e.edu_facilitador1||'',
          'edu-facilitador2': e.edu_facilitador2||'',
          'edu-educador-social': e.edu_educador_social||'',
          'edu-asa': e.edu_asa||''
        })
        if(typeof updateEspacoDropdown === 'function') updateEspacoDropdown(e.unidade_id, e.espaco_id)
        if (e.exposicao_assistentes) {
           e.exposicao_assistentes.forEach(a => {
               const cb = document.getElementById('chk-ast-' + a.usuario_id);
               if (cb) cb.checked = true;
           });
        }
        const { data: colabs } = await db.from('exposicao_colaboradores').select('papel, colaborador_id, colaboradores(nome)').eq('exposicao_id', id)
        if (colabs) colabs.forEach(c => {
          if (!editingEquipe[c.papel]) editingEquipe[c.papel] = []
          editingEquipe[c.papel].push({ id: c.colaborador_id, nome: c.colaboradores?.nome })
        })
      }
    } else {
      if(typeof updateEspacoDropdown === 'function') updateEspacoDropdown(null)
    }
    
    Object.keys(fields).forEach(k => {
      const el = document.getElementById('f-' + k)
      if (el) {
        el.value = fields[k]
        // Reset masks
        el.placeholder = ''
        el.style.background = ''
        el.disabled = false
      }
    })

    const isSec = currentProfile?.perfil === 'secretaria'
    const isCons = currentProfile?.perfil === 'consultor'
    
    // Máscara financeira para Secretaria
    if (isSec) {
      const finFields = ['valor', 'cache-curadoria', 'valor-cenotecnia', 'cont-producao', 'cont-arquitetura', 'cont-educativo', 'acessibilidade']
      finFields.forEach(f => {
        const el = document.getElementById('f-' + f)
        if (el) {
          el.value = ''
          el.placeholder = '🔒 Acesso Restrito'
          el.style.background = '#f9fafb'
          el.disabled = true
        }
      })
    }

    // Travas para Consultor
    if (isCons) {
      document.getElementById('modal-exp-save').style.display = 'none'
      document.getElementById('modal-exp-delete').style.display = 'none'
      document.getElementById('btn-gerar-cron').style.display = 'none'
    } else {
      document.getElementById('modal-exp-save').style.display = 'block'
      document.getElementById('modal-exp-delete').style.display = id ? 'block' : 'none'
    }

    renderEquipeEditor()
    document.getElementById('modal-exposicao').classList.add('open')
  } catch (err) {
    console.error('Erro ao abrir modal:', err)
    showToast('Erro ao carregar modal de edição', true)
  }
}

function closeExpModal() { document.getElementById('modal-exposicao').classList.remove('open'); editingExpId = null; document.querySelectorAll('.equipe-dropdown').forEach(d => d.remove()) }

async function saveExposicao() {
  const g = id => document.getElementById(id).value
  const titulo = g('f-titulo').trim()
  if (!titulo) { showToast('Informe o título', true); return }
  
  const assistentesCheckeds = Array.from(document.querySelectorAll('.chk-assistente:checked')).map(c => c.value);
  const gNum = id => { const v = document.getElementById(id).value; return v ? parseFloat(v) : null }
  const gInt = id => { const v = document.getElementById(id).value; return v ? parseInt(v) : null }

  const payload = {
    titulo, 
    unidade_id: g('f-unidade')||null,
    espaco_id: g('f-espaco')||null,
    status: g('f-status'), 
    semestre: g('f-semestre')||null,
    data_abertura: g('f-abertura')||null, 
    data_encerramento: g('f-encerramento')||null,
    periodo_previsto: g('f-periodo')||null, 
    capital_interior: g('f-capital')||null,
    ano: gInt('f-ano') || new Date().getFullYear(),
    valor_estimado: gNum('f-valor'),
    cache_curadoria: gNum('f-cache-curadoria'),
    valor_cenotecnia: gNum('f-valor-cenotecnia'),
    contrato_producao: g('f-cont-producao') || null,
    contrato_arquitetura: g('f-cont-arquitetura') || null,
    contrato_educativo: g('f-cont-educativo') || null,
    acessibilidade: g('f-acessibilidade') || null,
    sinopse: g('f-sinopse') || null,
    notas_adicionais: g('f-notas') || null,
    referencias_links: g('f-links') || null,
    historico_abertura: g('f-historico') || null,
    visitas_expo_meta: gInt('f-visitas-expo-meta'),
    visitas_expo_estatistico: gInt('f-visitas-expo-estat'),
    visitas_mediadas_meta: gInt('f-visitas-med-meta'),
    visitas_mediadas_estatistico: gInt('f-visitas-med-estat'),
    edu_estagiarios: gInt('f-edu-estagiarios'),
    edu_facilitador1: gInt('f-edu-facilitador1'),
    edu_facilitador2: gInt('f-edu-facilitador2'),
    edu_educador_social: gInt('f-edu-educador-social'),
    edu_asa: gInt('f-edu-asa')
  }

  // Se for Perfil Secretaria, não enviamos campos financeiros no update para não zerá-los
  if (currentProfile?.perfil === 'secretaria' && editingExpId) {
    ['valor_estimado', 'cache_curadoria', 'valor_cenotecnia', 'contrato_producao', 'contrato_arquitetura', 'contrato_educativo', 'acessibilidade'].forEach(k => delete payload[k])
  }
  let expId = editingExpId
  if (editingExpId) {
    const { error } = await db.from('exposicoes').update(payload).eq('id', editingExpId)
    if (error) { showToast('Erro: ' + error.message, true); return }
  } else {
    // Para inserção, capturamos os dados retornados para obter o ID gerado
    const { data, error } = await db.from('exposicoes').insert(payload).select('id').single()
    if (error) { 
      console.error('Erro no insert:', error)
      showToast('Erro ao criar: ' + error.message, true)
      return 
    }
    if (!data) {
      showToast('Erro: O banco não retornou o ID da nova exposição.', true)
      return
    }
    expId = data.id
  }
  // Salvar assistentes
  await db.from('exposicao_assistentes').delete().eq('exposicao_id', expId);
  if (assistentesCheckeds.length > 0) {
      await db.from('exposicao_assistentes').insert(assistentesCheckeds.map(aid => ({ exposicao_id: expId, usuario_id: aid })));
  }

  // Salvar equipe: apagar vínculos antigos e reinserir
  await db.from('exposicao_colaboradores').delete().eq('exposicao_id', expId)
  const toInsert = []
  PAPEIS.forEach(papel => {
    (editingEquipe[papel] || []).forEach(c => {
      toInsert.push({ exposicao_id: expId, colaborador_id: c.id, papel })
    })
  })
  if (toInsert.length) await db.from('exposicao_colaboradores').insert(toInsert)
  closeExpModal()
  showToast(editingExpId ? 'Exposição atualizada!' : 'Exposição criada!')
  // Recarregar a página ativa correta
  const paginaAtiva = document.querySelector('nav .nav-item.active')?.dataset?.page
  if (paginaAtiva === 'arquivo') {
    await loadArquivo()
  } else {
    await loadExposicoes()
  }
}

async function deleteExposicao() {
  if (!editingExpId || !confirm('Excluir esta exposição?')) return
  // Remover registros dependentes antes da exposição
  await db.from('exposicao_assistentes').delete().eq('exposicao_id', editingExpId)
  await db.from('exposicao_colaboradores').delete().eq('exposicao_id', editingExpId)
  await db.from('tarefas').delete().eq('exposicao_id', editingExpId)
  const { error } = await db.from('exposicoes').delete().eq('id', editingExpId)
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return }
  closeExpModal(); showToast('Exposição excluída'); await loadExposicoes()
}

async function loadUnidades() {
  const search = document.getElementById('search-unidade').value.toLowerCase()
  const [{ data: unidades, error }, { data: todasExpos }] = await Promise.all([
    db.from('unidades').select('*').order('nome'),
    db.from('exposicoes').select('*').order('data_abertura')
  ])
  if (error) { console.error(error); return }
  allUnidades = unidades || []
  const filtered = allUnidades.filter(u => !search || u.nome.toLowerCase().includes(search))
  const container = document.getElementById('unidades-container')
  if (!filtered.length) { container.innerHTML = `<div class="empty-state"><p>Nenhuma unidade encontrada</p></div>`; return }
  
  const today = new Date(); today.setHours(0,0,0,0)
  
  container.innerHTML = `<div class="unidade-grid">` + filtered.map(u => {
    const unitExpos = (todasExpos || []).filter(e => e.unidade_id === u.id)
    const espacos = allEspacos.filter(s => s.unidade_id === u.id)
    
    // Calcular visitação total (ano atual)
    const visitacaoTotal = unitExpos.filter(e => e.ano === today.getFullYear()).reduce((s,e) => s + (e.visitas_expo_estatistico||0) + (e.visitas_mediadas_estatistico||0), 0)
    
    // Determinar atual e próxima
    const atual = unitExpos.find(e => e.data_abertura && e.data_encerramento && new Date(e.data_abertura+'T12:00:00') <= today && new Date(e.data_encerramento+'T12:00:00') >= today)
    const proxima = unitExpos.filter(e => e.data_abertura && new Date(e.data_abertura+'T12:00:00') > today).sort((a,b) => new Date(a.data_abertura) - new Date(b.data_abertura))[0]
    
    return `
      <div class="unidade-card" onclick="openUnitModal('${u.id}')">
        <div>
          <div class="unidade-card-type">${u.capital_interior || 'Unidade'}</div>
          <div class="unidade-card-name">${u.nome}</div>
        </div>
        
        <div class="unidade-expos-info">
          <div class="unidade-expo-row">
            <span class="unidade-expo-label">Em cartaz</span>
            <span class="unidade-expo-title">${atual ? atual.titulo : '<span class="unidade-expo-empty">Nenhuma exposição ativa</span>'}</span>
          </div>
          <div class="unidade-expo-row">
            <span class="unidade-expo-label">Próxima abertura</span>
            <span class="unidade-expo-title">${proxima ? proxima.titulo : '<span class="unidade-expo-empty">Não agendada</span>'}</span>
          </div>
        </div>
        
        <div class="unidade-card-stats">
          <div class="unidade-stat-item">
            <div class="unidade-stat-value">${espacos.length}</div>
            <div class="unidade-stat-label">Espaços</div>
          </div>
          <div class="unidade-stat-item">
            <div class="unidade-stat-value">${visitacaoTotal.toLocaleString('pt-BR')}</div>
            <div class="unidade-stat-label">Público ${today.getFullYear()}</div>
          </div>
        </div>
      </div>`}).join('') + `</div>`
}

function openUnitModal(id = null) {
  editingUnitId = id
  document.querySelectorAll('.unit-tab-content').forEach(c => c.classList.remove('active'))
  document.getElementById('unit-tab-tecnica').classList.add('active')
  document.querySelectorAll('[data-unit-tab]').forEach(t => {
    t.classList.remove('active')
    if(t.dataset.unitTab === 'tecnica') t.classList.add('active')
  })

  const title = id ? 'Editar Unidade' : 'Nova Unidade'
  document.getElementById('modal-unit-title').textContent = title
  document.getElementById('modal-unit-delete').style.display = id ? 'block' : 'none'
  
  const fields = ['nome','capital','gerente','gerente-adj','coord-prog','super-art','tec-artes','tec-edu']
  fields.forEach(f => document.getElementById('fun-' + f).value = '')
  editingUnitSpaces = []
  editingUnitRepo = []

  if (id) {
    const u = allUnidades.find(x => x.id == id)
    if (u) {
      document.getElementById('fun-nome').value = u.nome || ''
      document.getElementById('fun-capital').value = u.capital_interior || ''
      document.getElementById('fun-gerente').value = u.gerente || ''
      document.getElementById('fun-gerente-adj').value = u.gerente_adjunto || ''
      document.getElementById('fun-coord-prog').value = u.coordenador_programacao || ''
      document.getElementById('fun-super-art').value = u.supervisor_artistico || ''
      document.getElementById('fun-tec-artes').value = u.tecnico_artes_visuais || ''
      document.getElementById('fun-tec-edu').value = u.tecnico_educativo || ''
      editingUnitSpaces = allEspacos.filter(s => s.unidade_id === id).map(s => ({ ...s }))
      editingUnitRepo = u.repositorio || []
      renderUnitVisitacao(id)
    }
  }
  const isCons = currentProfile?.perfil === 'consultor'
  if (isCons) {
    document.getElementById('modal-unit-save').style.display = 'none'
    document.getElementById('modal-unit-delete').style.display = 'none'
    document.getElementById('btn-add-espaco').style.display = 'none'
    document.getElementById('btn-add-repo').style.display = 'none'
    document.querySelectorAll('.btn-remove-espaco').forEach(b => b.style.display = 'none')
    document.querySelectorAll('.btn-remove-repo').forEach(b => b.style.display = 'none')
  } else {
    document.getElementById('modal-unit-save').style.display = 'block'
    document.getElementById('modal-unit-delete').style.display = id ? 'block' : 'none'
    document.getElementById('btn-add-espaco').style.display = 'block'
    document.getElementById('btn-add-repo').style.display = 'block'
  }

  renderUnitSpaces()
  renderUnitRepo()
  document.getElementById('modal-unidade').classList.add('open')
}

function renderUnitSpaces() {
  const container = document.getElementById('fun-espacos-lista')
  if (!container) return
  if (!editingUnitSpaces.length) { 
    container.innerHTML = '<div style="padding:15px; color:var(--muted); font-size:12px; text-align:center">Nenhum espaço cadastrado.</div>'; 
    return 
  }
  const isCons = currentProfile?.perfil === 'consultor'
  container.innerHTML = editingUnitSpaces.map((s, idx) => `
    <div class="espaco-item">
      <div class="espaco-item-info"><strong>${s.nome}</strong> <span>${s.metragem} m²</span></div>
      ${isCons ? '' : `<button class="btn-remove-espaco" onclick="removeUnitSpace(${idx})">×</button>`}
    </div>`).join('')
}

function addUnitSpace() {
  const nome = document.getElementById('new-espaco-nome').value.trim()
  const metragem = document.getElementById('new-espaco-metragem').value
  if (!nome) { showToast('Informe o nome do espaço', true); return }
  editingUnitSpaces.push({ nome, metragem: parseFloat(metragem) || 0 })
  document.getElementById('new-espaco-nome').value = ''
  document.getElementById('new-espaco-metragem').value = ''
  renderUnitSpaces()
}

function removeUnitSpace(idx) {
  editingUnitSpaces.splice(idx, 1)
  renderUnitSpaces()
}

async function saveUnidade() {
  const getV = id => document.getElementById(id).value
  const nome = getV('fun-nome').trim()
  if (!nome) { showToast('Informe o nome da unidade', true); return }
  
  const payload = {
    nome,
    capital_interior: getV('fun-capital') || null,
    gerente: getV('fun-gerente') || null,
    gerente_adjunto: getV('fun-gerente-adj') || null,
    coordenador_programacao: getV('fun-coord-prog') || null,
    supervisor_artistico: getV('fun-super-art') || null,
    tecnico_artes_visuais: getV('fun-tec-artes') || null,
    tecnico_educativo: getV('fun-tec-edu') || null,
    repositorio: editingUnitRepo
  }
  
  let unitId = editingUnitId
  if (editingUnitId) {
    const { error } = await db.from('unidades').update(payload).eq('id', editingUnitId)
    if (error) { showToast('Erro ao salvar: ' + error.message, true); return }
  } else {
    const { data, error } = await db.from('unidades').insert(payload).select().single()
    if (error) { showToast('Erro ao criar: ' + error.message, true); return }
    unitId = data.id
  }
  
  // Salvar espaços: remover antigos e inserir novos
  const { error: delErr } = await db.from('unidade_espacos').delete().eq('unidade_id', unitId)
  if (delErr) { console.error('Erro ao limpar espaços:', delErr) }

  if (editingUnitSpaces.length > 0) {
    const spacesToInsert = editingUnitSpaces.map(s => {
      const { id, created_at, ...cleanSpace } = s // Remover campos internos do banco
      return { ...cleanSpace, unidade_id: unitId }
    })
    const { error: insErr } = await db.from('unidade_espacos').insert(spacesToInsert)
    if (insErr) { showToast('Erro ao salvar espaços: ' + insErr.message, true); return }
  }
  
  closeUnitModal()
  showToast('Unidade salva!')
  await loadBaseData()
  loadUnidades()
}

async function deleteUnidade() {
  if (!editingUnitId || !confirm('Excluir esta unidade? Isso removerá todos os espaços vinculados.')) return
  const { error } = await db.from('unidades').delete().eq('id', editingUnitId)
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return }
  closeUnitModal(); showToast('Unidade excluída'); await loadBaseData(); loadUnidades()
}

function closeUnitModal() { document.getElementById('modal-unidade').classList.remove('open'); editingUnitId = null }

async function renderUnitVisitacao(unitId) {
  const { data: expos } = await db.from('exposicoes').select('*').eq('unidade_id', unitId).order('ano', { ascending: false })
  const resumoDiv = document.getElementById('unit-visitacao-resumo')
  const historicoDiv = document.getElementById('unit-historico-lista')
  
  if (!expos || !expos.length) {
    if(resumoDiv) resumoDiv.innerHTML = '<div style="color:var(--muted)">Sem dados de visitação</div>'
    if(historicoDiv) historicoDiv.innerHTML = '<div style="color:var(--muted)">Nenhuma exposição anterior</div>'
    return
  }
  
  const porAno = {}
  expos.forEach(e => {
    if (!porAno[e.ano]) porAno[e.ano] = 0
    porAno[e.ano] += (e.visitas_expo_estatistico || 0) + (e.visitas_mediadas_estatistico || 0)
  })
  
  if(resumoDiv) resumoDiv.innerHTML = Object.entries(porAno).map(([ano, total]) => `
    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border)">
      <span><strong>${ano}</strong></span>
      <span>${total.toLocaleString('pt-BR')} visitantes</span>
    </div>`).join('')
    
  if(historicoDiv) historicoDiv.innerHTML = expos.map(e => `
    <div style="padding:6px 0; border-bottom:1px dashed var(--border); opacity:0.8">
      <strong>${e.ano}</strong> - ${e.titulo} (${(e.visitas_expo_estatistico||0) + (e.visitas_mediadas_estatistico||0)} visitantes)
    </div>`).join('')
}

function renderUnitRepo() {
  const list = document.getElementById('fun-repo-lista')
  if(!list) return
  const isCons = currentProfile?.perfil === 'consultor'
  list.innerHTML = editingUnitRepo.map((r, i) => `
    <div class="repo-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border)">
      <a href="${r.url}" target="_blank" class="repo-item-link" style="color:var(--accent); text-decoration:none">📄 ${r.titulo}</a>
      ${isCons ? '' : `<button class="btn-remove-espaco btn-remove-repo" onclick="removeRepoItem(${i})" style="padding:2px 8px; font-size:16px">&times;</button>`}
    </div>`).join('')
}

function removeRepoItem(i) { editingUnitRepo.splice(i, 1); renderUnitRepo() }

// Adicionar listeners do repositório se não existirem
if(!window.repoListenersAdded) {
  document.addEventListener('click', e => {
    if(e.target.id === 'btn-add-repo') {
      const tit = document.getElementById('new-repo-titulo').value.trim()
      const url = document.getElementById('new-repo-url').value.trim()
      if (!tit || !url) return
      editingUnitRepo.push({ titulo: tit, url })
      document.getElementById('new-repo-titulo').value = ''
      document.getElementById('new-repo-url').value = ''
      renderUnitRepo()
    }
  })
  window.repoListenersAdded = true
}

// Tabs logic simplificada
document.addEventListener('click', e => {
  if (e.target.dataset.unitTab) {
    const tab = e.target.dataset.unitTab
    document.querySelectorAll('[data-unit-tab]').forEach(t => t.classList.remove('active'))
    e.target.classList.add('active')
    document.querySelectorAll('.unit-tab-content').forEach(c => c.classList.remove('active'))
    const target = document.getElementById('unit-tab-' + tab)
    if(target) target.classList.add('active')
  }
})

async function loadTimeline() {
  const container = document.getElementById('timeline-container')
  container.innerHTML = '<div class="loading">Carregando timeline...</div>'
  
  const ano = new Date().getFullYear()
  const jan1 = `${ano}-01-01`
  const dez31 = `${ano}-12-31`
  const queryStr = '*, unidades(nome), unidade_espacos(nome), exposicao_assistentes(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))'
  
  // Buscar exposições que se sobrepõem ao ano atual ou que pertencem ao ano mas não têm data fixa
  const { data: exposicoes, error } = await db.from('exposicoes')
    .select(queryStr)
    .or(`data_abertura.lte.${dez31},and(data_abertura.is.null,ano.eq.${ano})`)
    .or(`data_encerramento.gte.${jan1},data_encerramento.is.null`)
    .not('status', 'in', '("Cancelada","Postergada","Suspensa")')
    .order('data_abertura')
  
  if (error) { console.error(error); return }
  allExposicoes = exposicoes || []
  renderTimeline(allExposicoes)
}

function renderTimeline(exposicoes) {
  const container = document.getElementById('timeline-container')
  const mesesCurto = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  
  let html = `
    <div class="timeline-header">
      <div class="timeline-header-cell" style="text-align:left">Unidade / Espaço</div>
      ${mesesCurto.map(m => `<div class="timeline-header-cell">${m}</div>`).join('')}
    </div>`

  // Agrupar unidades e seus espaços
  allUnidades.forEach(u => {
    const espacos = allEspacos.filter(s => s.unidade_id === u.id)
    if (!espacos.length) {
      html += renderTimelineRow(u.nome, null, exposicoes.filter(e => e.unidade_id === u.id))
    } else {
      espacos.forEach(s => {
        html += renderTimelineRow(u.nome, s.nome, exposicoes.filter(e => e.unidade_id === u.id && e.espaco_id === s.id))
      })
      const semEspaco = exposicoes.filter(e => e.unidade_id === u.id && !e.espaco_id)
      if(semEspaco.length) html += renderTimelineRow(u.nome, 'Não definido', semEspaco)
    }
  })

  container.innerHTML = html
}

function renderTimelineRow(unidadeNome, espacoNome, lista) {
  const meses = [0,1,2,3,4,5,6,7,8,9,10,11]
  let barsHtml = ''
  const viewYear = new Date().getFullYear()
  
  lista.forEach(e => {
    let start, end, isEstimated = false
    
    if (e.data_abertura) {
      start = new Date(e.data_abertura + 'T12:00:00')
      end = e.data_encerramento ? new Date(e.data_encerramento + 'T12:00:00') : new Date(start.getTime() + 30*24*60*60*1000)
    } else if (e.periodo_previsto) {
      const previsao = getMesesDoTexto(e.periodo_previsto)
      if (previsao) {
        isEstimated = true
        start = new Date(viewYear, previsao.inicio, 1, 12, 0, 0)
        end = new Date(viewYear, previsao.fim, 28, 12, 0, 0)
      } else {
        return // Ocultar se não encontrar nenhum mês reconhecido
      }
    } else {
      return // Sem data e sem previsão reconhecível
    }
    
    if (start.getFullYear() < viewYear) start = new Date(viewYear, 0, 1, 12, 0, 0)
    if (end.getFullYear() > viewYear) end = new Date(viewYear, 11, 31, 12, 0, 0)
    if (start > end) return

    const startMonth = start.getMonth() + (start.getDate()/31)
    const endMonth = end.getMonth() + (end.getDate()/31)
    const duration = Math.max(0.2, endMonth - startMonth)
    
    const left = (startMonth / 12) * 100
    const width = (duration / 12) * 100
    
    const labelData = isEstimated ? (e.periodo_previsto) : `${fmtDate(e.data_abertura)} — ${fmtDate(e.data_encerramento)}`

    barsHtml += `
      <div class="timeline-bar ${bc(e.status)} ${isEstimated ? 'estimated' : ''}" 
           style="left:calc(${left}%); width:calc(${width}%);"
           onclick="openPainel('${e.id}')">
        <span style="font-weight:700">${e.titulo}</span>
        <span class="timeline-bar-dates">${labelData}</span>
      </div>`
  })

  return `
    <div class="timeline-row">
      <div class="timeline-unit-cell">
        <div class="timeline-unit-name">${unidadeNome}</div>
        ${espacoNome ? `<div class="timeline-unit-space">${espacoNome}</div>` : ''}
      </div>
      ${meses.map(() => `<div class="timeline-month-cell"></div>`).join('')}
      <div class="timeline-bar-container">${barsHtml}</div>
    </div>`
}


function renderEquipeEditor() {
  const container = document.getElementById('equipe-editor')
  if (!container) return
  
  const chunks = PAPEIS.map(papel => {
    const key = papel.replace(/\s/g,'_')
    const membros = (editingEquipe[papel] || [])
    const listaHtml = membros.map(m => `
      <div class="equipe-membro-tag">
        ${m.nome}
        <span class="remove" onclick="removeEquipeMembro('${papel}','${m.id}')">&times;</span>
      </div>`).join('')
    
    return `
      <div class="equipe-papel-row">
        <div class="equipe-papel-label">${papel}</div>
        <div class="equipe-membros-list">${listaHtml}</div>
        <div style="position:relative; margin-top:4px">
          <input type="text" class="equipe-search-input" placeholder="Adicionar..." 
                 id="search-equipe-${key}"
                 oninput="filtrarEquipeDropdown(this, '${papel}')" 
                 onblur="setTimeout(() => fecharDropdown('${papel}'), 200)">
        </div>
      </div>`
  }).join('')

  container.innerHTML = `<div class="equipe-grid">${chunks}</div>`
}

function filtrarEquipeDropdown(input, papel) {

  const q = input.value.toLowerCase()
  const jaVinculados = (editingEquipe[papel]||[]).map(c => c.id)
  const filtrados = allColaboradores.filter(c =>
    c.nome.toLowerCase().includes(q) && !jaVinculados.includes(c.id)
  ).slice(0, 8)
  const key = papel.replace(/\s/g,'_')
  let dd = document.getElementById('dd-' + key)
  if (!dd) {
    dd = document.createElement('div')
    dd.className = 'equipe-dropdown'
    dd.id = 'dd-' + key
    input.parentNode.appendChild(dd)
  }
  if (!filtrados.length) { dd.innerHTML = '<div class="equipe-dropdown-item" style="color:var(--muted)">Nenhum resultado</div>'; return }
  dd.innerHTML = filtrados.map(c => `
    <div class="equipe-dropdown-item" onmousedown="addEquipeMembro('${papel}','${c.id}','${c.nome.replace(/'/g,"\\'")}')">
      ${c.nome} <small>${c.funcao||''}</small>
    </div>`).join('')
}

function fecharDropdown(papel) {
  const dd = document.getElementById('dd-' + papel.replace(/\s/g,'_'))
  if (dd) dd.remove()
}

function addEquipeMembro(papel, id, nome) {
  if (!editingEquipe[papel]) editingEquipe[papel] = []
  if (editingEquipe[papel].find(c => c.id === id)) return
  editingEquipe[papel].push({ id, nome })
  renderEquipeEditor()
  // Manter foco no campo do papel correto
  setTimeout(() => {
    const inp = document.getElementById('search-equipe-' + papel.replace(/\s/g,'_'))
    if (inp) { inp.value = ''; inp.focus() }
  }, 50)
}

function removeEquipeMembro(papel, id) {
  if (!editingEquipe[papel]) return
  editingEquipe[papel] = editingEquipe[papel].filter(c => c.id !== id)
  renderEquipeEditor()
}

// COLABORADORES
document.getElementById('btn-novo-colaborador').addEventListener('click', () => openColabModal())
document.getElementById('modal-colab-close').addEventListener('click', closeColabModal)
document.getElementById('modal-colab-cancel').addEventListener('click', closeColabModal)
document.getElementById('modal-colab-save').addEventListener('click', saveColaborador)
document.getElementById('modal-colab-delete').addEventListener('click', deleteColaborador)

async function loadColaboradores() {
  const search = document.getElementById('search-colab').value.toLowerCase()
  const funcaoFiltro = document.getElementById('filter-funcao').value
  let q = db.from('colaboradores').select('*').order('nome')
  if (funcaoFiltro) q = q.contains('funcao', [funcaoFiltro])
  const { data, error } = await q
  if (error) { console.error('Colaboradores error:', error); return }
  allColaboradores = data || []
  const filtered = allColaboradores.filter(c =>
    !search || c.nome.toLowerCase().includes(search) || (c.empresa||'').toLowerCase().includes(search)
  )
  const container = document.getElementById('colaboradores-container')
  if (!filtered.length) { container.innerHTML = `<div class="empty-state"><p>Nenhum colaborador encontrado</p></div>`; return }

  // Buscar participações de todos os colaboradores filtrados (inclui unidade)
  const ids = filtered.map(c => c.id)
  const { data: partsData } = await db.from('exposicao_colaboradores')
    .select('colaborador_id, papel, exposicoes(id, titulo, ano, status, unidades(nome))')
    .in('colaborador_id', ids)
  const partsMap = {}
  ;(partsData || []).forEach(p => {
    if (!partsMap[p.colaborador_id]) partsMap[p.colaborador_id] = []
    partsMap[p.colaborador_id].push(p)
  })

  const ATIVOS = ['Aberta','Em produção','Em aprovação','Em tratativas']
  const alphaSort = (a, b) => (a.exposicoes?.titulo||'').localeCompare(b.exposicoes?.titulo||'', 'pt-BR')

  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th style="width:200px">Nome</th><th style="width:160px">Funções</th><th>Projetos</th></tr></thead>
      <tbody>${filtered.map(c => {
        const funcArray = Array.isArray(c.funcao) ? c.funcao : (c.funcao ? [c.funcao] : [])
        const funcoes = funcArray.map(f => `<span class="chip-funcao">${f}</span>`).join('')
        const allParts = partsMap[c.id] || []

        // Separar ativos (qualquer ano) e encerrados
        const ativos = allParts
          .filter(p => ATIVOS.includes(p.exposicoes?.status||''))
          .sort(alphaSort)

        const encerrados = allParts
          .filter(p => !ATIVOS.includes(p.exposicoes?.status||''))
          .sort((a,b) => (b.exposicoes?.ano||0) - (a.exposicoes?.ano||0) || alphaSort(a,b))

        // Mostrar todos os ativos + pelo menos 1 encerrado recente
        const toShow = [...ativos, ...encerrados.slice(0, Math.max(1, encerrados.length > 0 ? 1 : 0))]

        const chips = toShow.map(p => {
          const ativo = ATIVOS.includes(p.exposicoes?.status||'')
          const tit = (p.exposicoes?.titulo||'?').split(' ').slice(0,4).join(' ')
          const unidade = p.exposicoes?.unidades?.nome ? `<span style="opacity:0.6;font-size:10px;margin-left:3px">(${p.exposicoes.unidades.nome.split(' ').slice(-1)[0]})</span>` : ''
          const cor = ativo
            ? 'background:#dcfce7;color:#166534;border:1px solid #bbf7d0'
            : 'background:var(--tag-bg);color:var(--muted);border:1px solid var(--border)'
          return `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:500;margin:2px;${cor}">${tit}${ativo ? ' ●' : ''}${unidade}</span>`
        }).join('')

        const extraEncerrados = encerrados.length > 1
          ? `<span style="font-size:10px;color:var(--muted);margin-left:4px">+${encerrados.length-1} encerrada${encerrados.length-1>1?'s':''}</span>`
          : ''
        return `
          <tr onclick="openColabModal('${c.id}')">
            <td><strong>${c.nome}</strong>${c.empresa?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${c.empresa}</div>`:''}</td>
            <td>${funcoes|async function loadEducativo() {
  const container = document.getElementById('educativo-container')
  container.innerHTML = '<div class="loading">Carregando equipe educativa...</div>'

  const ATIVOS = ['Aberta','Em produção','Em aprovação','Em tratativas']
  const CAMPOS_SAL = [
    { key: 'edu_estagiarios',    label: 'Estagiários',   salKey: 'sal_estagiarios' },
    { key: 'edu_facilitador1',   label: 'Facilitador I', salKey: 'sal_facilitador1' },
    { key: 'edu_facilitador2',   label: 'Facilitador II',salKey: 'sal_facilitador2' },
    { key: 'edu_asa',            label: 'ASA',           salKey: 'sal_asa' }
  ]
  const CAMPOS_TODOS = [
    ...CAMPOS_SAL,
    { key: 'edu_educador_social', label: 'Ed. Social', salKey: null }
  ]

  const salarios = {}
  CAMPOS_SAL.forEach(c => { salarios[c.salKey] = parseFloat(localStorage.getItem('edu_sal_' + c.salKey) || '0') })

  // Buscar TODAS as exposições válidas para separar ativas da última encerrada
  const anoAtual = new Date().getFullYear()
  const { data: expos, error } = await db.from('exposicoes')
    .select('id, titulo, status, ano, data_abertura, unidade_id, unidades(nome), edu_estagiarios, edu_facilitador1, edu_facilitador2, edu_educador_social, edu_asa')
    .not('status', 'in', '("Cancelada","Postergada")')
  
  if (error) { container.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados</p></div>'; return }

  const allExpos = expos || []
  const exposAtivas = allExpos.filter(e => ATIVOS.includes(e.status)).sort((a,b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  
  // Encontrar a última encerrada de cada unidade
  const encerradas = allExpos.filter(e => e.status === 'Encerrada')
  // Ordenar por ano desc, depois data desc
  encerradas.sort((a,b) => (b.ano - a.ano) || (new Date(b.data_abertura||0) - new Date(a.data_abertura||0)))
  const ultimaPorUnidade = {}
  encerradas.forEach(e => {
    const uid = e.unidade_id || '_sem'
    if (!ultimaPorUnidade[uid]) ultimaPorUnidade[uid] = e
  })

  // KPIs globais (apenas ATIVAS)
  const totais = {}
  CAMPOS_TODOS.forEach(c => { totais[c.key] = exposAtivas.reduce((s,e) => s + (e[c.key]||0), 0) })
  const totalPessoas = Object.values(totais).reduce((s,v) => s+v, 0)
  const custoTotal = CAMPOS_SAL.reduce((s,c) => s + totais[c.key] * (salarios[c.salKey]||0), 0)

  // Painel de salários
  const salariosHtml = `
    <div class="dash-card" style="margin-bottom:20px">
      <div class="dash-title" style="margin-bottom:16px">Salários Mensais de Referência</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;align-items:end">
        ${CAMPOS_SAL.map(c => `
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:6px">${c.label}</div>
            <input type="number" id="edu-sal-${c.salKey}" value="${salarios[c.salKey]||''}" placeholder="R$ 0,00"
              style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;background:var(--bg);color:var(--text)"
              oninput="_salvarSalarioEdu('${c.salKey}', this.value)">
          </div>`).join('')}
        <div style="display:flex;align-items:flex-end">
          <div style="background:var(--accent2);color:#fff;border-radius:10px;padding:10px 18px;font-family:'Fraunces',serif;font-size:18px;white-space:nowrap">
            ${custoTotal ? 'R$ ' + custoTotal.toLocaleString('pt-BR',{minimumFractionDigits:2}) : 'R$ —'}
            <div style="font-size:10px;font-weight:400;opacity:0.8;font-family:'DM Sans'">/mês estimado</div>
          </div>
        </div>
      </div>
    </div>`

  const kpiHtml = `
    <div class="kpi-grid" style="margin-top:0;margin-bottom:24px">
      <div class="kpi-card"><div class="kpi-value">${totalPessoas}</div><div class="kpi-label">Total Equipe Educativa</div><div class="kpi-sub">${exposAtivas.length} exposições ativas</div></div>
      ${CAMPOS_TODOS.map(c => `<div class="kpi-card"><div class="kpi-value">${totais[c.key]}</div><div class="kpi-label">${c.label}</div></div>`).join('')}
    </div>`

  // Índice de exposições ATIVAS por unidade
  const expoPorUnidade = {}
  exposAtivas.forEach(e => {
    const uid = e.unidade_id || '_sem'
    if (!expoPorUnidade[uid]) expoPorUnidade[uid] = []
    expoPorUnidade[uid].push(e)
  })

  // Unidades ordenadas (incluindo as que só tem histórico)
  const unidadesOrdenadas = [...allUnidades].sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  if (expoPorUnidade['_sem']?.length || ultimaPorUnidade['_sem']) {
    unidadesOrdenadas.push({ id: '_sem', nome: 'Sem unidade' })
  }

  const colWidth = 90
  let tableHtml = `
    <div class="timeline-wrapper" style="margin-top:0;overflow-x:auto">
      <div style="display:grid;grid-template-columns:1fr ${CAMPOS_TODOS.map(()=>colWidth+'px').join(' ')};background:#eee;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10">
        <div style="padding:12px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Unidade / Exposição</div>
        ${CAMPOS_TODOS.map(c => `<div style="padding:12px 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);text-align:center;border-left:1px solid var(--border)">${c.label}</div>`).join('')}
      </div>`

  unidadesOrdenadas.forEach(u => {
    const uid = u.id
    const uExposAtivas = expoPorUnidade[uid] || []
    const uUltima = ultimaPorUnidade[uid]
    
    // Mostra a unidade se tem ativa OU se tem última encerrada
    const temDados = uExposAtivas.length > 0 || !!uUltima
    if (!temDados && uid !== '_sem') {
       // Se o usuário quer TODAS as unidades mesmo sem NADA, mostramos.
       // Mas já está configurado para mostrar tudo que está em allUnidades!
    }

    // Totais SÓ DAS ATIVAS na linha da unidade
    const totU = {}
    CAMPOS_TODOS.forEach(c => { totU[c.key] = uExposAtivas.reduce((s,e) => s+(e[c.key]||0), 0) })

    tableHtml += `
      <div id="edu-unit-${uid}" style="display:grid;grid-template-columns:1fr ${CAMPOS_TODOS.map(()=>colWidth+'px').join(' ')};background:#f5f3ef;border-bottom:2px solid var(--border);${temDados?'cursor:pointer':''}" ${temDados?`onclick="toggleEduUnit('${uid}')"`:''}">
        <div style="padding:12px 16px;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px">
          ${temDados ? `<span id="edu-arrow-${uid}" style="font-size:10px;transition:transform 0.2s">▶</span>` : `<span style="font-size:10px;opacity:0.3">—</span>`}
          ${u.nome}
          ${!temDados ? '<span style="font-size:11px;font-weight:400;color:var(--muted);margin-left:4px">sem histórico ou ativas</span>' : ''}
        </div>
        ${CAMPOS_TODOS.map(c => `<div style="padding:12px 6px;text-align:center;font-size:14px;font-weight:700;color:${totU[c.key]?'var(--text)':'var(--muted)'};border-left:1px solid var(--border)">${totU[c.key]||'—'}</div>`).join('')}
      </div>
      <div id="edu-rows-${uid}" style="display:none; background:#fafafa;">`

    // Linha de Comparativo (Última Encerrada)
    if (uUltima) {
      tableHtml += `
        <div style="display:grid;grid-template-columns:1fr ${CAMPOS_TODOS.map(()=>colWidth+'px').join(' ')};border-bottom:1px solid #e2e8f0;cursor:pointer;background:#f8fafc;" onclick="openPainel('${uUltima.id}')">
          <div style="padding:10px 16px 10px 34px;font-size:12px;display:flex;align-items:center;gap:8px;color:var(--muted)">
            <span style="width:7px;height:7px;border-radius:50%;background:#94a3b8;flex-shrink:0;display:inline-block"></span>
            <i>[Última] ${uUltima.titulo} <span style="font-size:10px;margin-left:4px">(${uUltima.ano})</span></i>
          </div>
          ${CAMPOS_TODOS.map(c => `<div style="padding:10px 6px;text-align:center;font-size:12px;color:var(--muted);border-left:1px solid var(--border)">${uUltima[c.key]||'—'}</div>`).join('')}
        </div>`
    }

    // Exposições Ativas
    uExposAtivas.forEach(e => {
      const dotColor = '#22c55e'
      const anoLabel = e.ano !== anoAtual ? `<span style="font-size:10px;background:#fef9c3;color:#92400e;padding:1px 6px;border-radius:10px;margin-left:6px">${e.ano}</span>` : ''
      tableHtml += `
        <div style="display:grid;grid-template-columns:1fr ${CAMPOS_TODOS.map(()=>colWidth+'px').join(' ')};border-bottom:1px solid var(--border);cursor:pointer" onclick="openPainel('${e.id}')">
          <div style="padding:10px 16px 10px 34px;font-size:13px;display:flex;align-items:center;gap:8px">
            <span style="width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;display:inline-block"></span>
            ${e.titulo}${anoLabel}
          </div>
          ${CAMPOS_TODOS.map(c => `<div style="padding:10px 6px;text-align:center;font-size:13px;color:${e[c.key]?'var(--text)':'var(--muted)'};border-left:1px solid var(--border)">${e[c.key]||'—'}</div>`).join('')}
        </div>`
    })

    tableHtml += `</div>`
  })

  tableHtml += `</div>`
  container.innerHTML = salariosHtml + kpiHtml + tableHtml
}

function _salvarSalarioEdu(key, val) {
  localStorage.setItem('edu_sal_' + key, parseFloat(val) || 0)
  // Recarregar para recalcular o custo com os dados reais do banco
  loadEducativo()
}

function toggleEduUnit(uid) {
  const rows = document.getElementById('edu-rows-' + uid)
  const arrow = document.getElementById('edu-arrow-' + uid)
  if (!rows) return
  const open = rows.style.display === 'block'
  rows.style.display = open ? 'none' : 'block'
  if (arrow) arrow.style.transform = open ? '' : 'rotate(90deg)'
}

function openColabModal(id = null) {
  editingColabId = id
  document.getElementById('modal-colab-title').textContent = id ? 'Editar Colaborador' : 'Novo Colaborador'
  document.getElementById('modal-colab-delete').style.display = id ? 'block' : 'none'
  document.querySelectorAll('.chk-funcao').forEach(c => c.checked = false)
  if (!id) {
    ['nome','empresa','email','telefone','obs'].forEach(f => document.getElementById('fc-'+f).value = '')
    document.getElementById('fc-participacoes-container').style.display = 'none'
  } else {
    const c = allColaboradores.find(x => x.id === id)
    if (c) {
      document.getElementById('fc-nome').value     = c.nome||''
      document.getElementById('fc-empresa').value  = c.empresa||''
      document.getElementById('fc-email').value    = c.email||''
      document.getElementById('fc-telefone').value = c.telefone||''
      document.getElementById('fc-obs').value      = c.observacoes||''
      // marcar funções (array)
      const funcoes = Array.isArray(c.funcao) ? c.funcao : (c.funcao ? [c.funcao] : [])
      document.querySelectorAll('.chk-funcao').forEach(cb => { cb.checked = funcoes.includes(cb.value) })
    }
    document.getElementById('fc-participacoes-container').style.display = 'block';
    document.getElementById('fc-participacoes').innerHTML = '<div class="loading" style="padding:0">Carregando participações...</div>';
    db.from('exposicao_colaboradores').select('papel, exposicoes(titulo, ano)').eq('colaborador_id', id).then(({data}) => {
      const el = document.getElementById('fc-participacoes');
      if (!data || !data.length) el.innerHTML = '<span style="color:var(--muted);font-style:italic">Nenhuma participação registrada.</span>';
      else {
        data.sort((a,b) => (b.exposicoes?.ano||0) - (a.exposicoes?.ano||0));
        el.innerHTML = '<ul style="margin:0;padding-left:14px;color:var(--text)">' + data.map(d => `<li><strong style="width:40px;display:inline-block">${d.exposicoes?.ano||'—'}</strong> ${d.exposicoes?.titulo} <span style="opacity:0.6;font-size:10px">(${d.papel})</span></li>`).join('') + '</ul>';
      }
    });
  }
  document.getElementById('modal-colaborador').classList.add('open')
}

function closeColabModal() { document.getElementById('modal-colaborador').classList.remove('open'); editingColabId = null }

async function saveColaborador() {
  const nome = document.getElementById('fc-nome').value.trim()
  if (!nome) { showToast('Informe o nome', true); return }
  const funcoes = Array.from(document.querySelectorAll('.chk-funcao:checked')).map(c => c.value)
  const payload = {
    nome,
    funcao:      funcoes.length ? funcoes : null,
    empresa:     document.getElementById('fc-empresa').value ||null,
    email:       document.getElementById('fc-email').value   ||null,
    telefone:    document.getElementById('fc-telefone').value||null,
    observacoes: document.getElementById('fc-obs').value     ||null,
  }
  const { error } = editingColabId
    ? await db.from('colaboradores').update(payload).eq('id', editingColabId)
    : await db.from('colaboradores').insert(payload)
  if (error) { showToast('Erro: ' + error.message, true); return }
  closeColabModal(); showToast(editingColabId ? 'Atualizado!' : 'Criado!'); await loadColaboradores()
}

async function deleteColaborador() {
  if (!editingColabId || !confirm('Atenção: Excluir este colaborador o removerá de todas as exposições históricas em que ele participou. Tem certeza?')) return
  await db.from('exposicao_colaboradores').delete().eq('colaborador_id', editingColabId);
  const { error } = await db.from('colaboradores').delete().eq('id', editingColabId)
  if (error) { showToast('Erro ao excluir', true); return }
  closeColabModal(); showToast('Excluído'); await loadColaboradores()
}

// ARQUIVO
let arquivoAnoAtivo = null

async function loadArquivo() {
  const anoAtual = new Date().getFullYear()
  const { data } = await db.from('exposicoes')
    .select('*, unidades(nome), exposicao_assistentes(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))')
    .lt('ano', anoAtual)
    .in('status', ['Aberta','Encerrada'])
    .order('ano', { ascending: false })
    .order('data_abertura')
  arquivoDados = data || []
  const container = document.getElementById('arquivo-container')
  if (!arquivoDados.length) { container.innerHTML = `<div class="empty-state"><p>Sem exposições anteriores</p></div>`; return }

  const anos = [...new Set(arquivoDados.map(e => e.ano))].sort((a,b) => b-a)
  arquivoAnoAtivo = arquivoAnoAtivo && anos.includes(arquivoAnoAtivo) ? arquivoAnoAtivo : anos[0]
  renderArquivo(anos)
}

let _arquivoAnos = []

function renderArquivo(anos) {
  if (!anos?.length) anos = _arquivoAnos
  _arquivoAnos = anos
  const container = document.getElementById('arquivo-container')
  const searchVal = (document.getElementById('search-arquivo')?.value || '').toLowerCase()
  const unidadeFiltro = document.getElementById('filter-arquivo-unidade')?.value || ''

  let lista = arquivoDados.filter(e => e.ano === arquivoAnoAtivo)
  if (searchVal) lista = lista.filter(e => (e.titulo||'').toLowerCase().includes(searchVal))
  if (unidadeFiltro) lista = lista.filter(e => String(e.unidade_id) === String(unidadeFiltro))

  // KPIs do ano
  const orcTotal = lista.reduce((s,e) => s + (parseFloat(e.valor_estimado)||0), 0)
  const encerradas = lista.filter(e => e.status === 'Encerrada').length
  const abertas = lista.filter(e => e.status === 'Aberta').length

  const isSec = currentProfile?.perfil === 'secretaria'
  const orcHtml = isSec 
    ? `<div class="kpi-value" style="font-size:18px">🔒 RESTRITO</div><div class="kpi-label">Orçamento total</div><div class="kpi-sub">Acesso administrativo necessário</div>`
    : `<div class="kpi-value">${orcTotal ? fmtMoney(orcTotal) : '—'}</div><div class="kpi-label">Orçamento total</div><div class="kpi-sub">${lista.filter(e=>e.valor_estimado).length} com valores registrados</div>`

  container.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;">
      ${anos.map(a => `
        <button onclick="arquivoAnoAtivo=${a};renderArquivo(${JSON.stringify(anos)})" style="
          padding:8px 22px; border-radius:20px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
          cursor:pointer; border:1px solid var(--border); transition:all 0.15s;
          background:${a===arquivoAnoAtivo?'var(--accent2)':'var(--surface)'};
          color:${a===arquivoAnoAtivo?'#fff':'var(--muted)'};
        ">${a}</button>`).join('')}
    </div>

    <div class="kpi-grid" style="margin-top:0;margin-bottom:28px">
      <div class="kpi-card"><div class="kpi-value">${lista.length}</div><div class="kpi-label">Exposições</div><div class="kpi-sub">${encerradas} encerradas · ${abertas} abertas</div></div>
      <div class="kpi-card">${orcHtml}</div>
      <div class="kpi-card"><div class="kpi-value">${[...new Set(lista.map(e=>e.unidade_id).filter(Boolean))].length}</div><div class="kpi-label">Unidades</div></div>
      <div class="kpi-card"><div class="kpi-value">${lista.filter(e=>e.data_abertura&&e.data_encerramento).length}</div><div class="kpi-label">Com datas completas</div></div>
    </div>

    <div class="cards-grid">
      ${lista.map(e => `
        <div class="card" onclick="openPainel('${e.id}')">
          <div class="card-status-bar ${bc(e.status)}"></div>
          <div class="card-unidade">${e.unidades?.nome||'—'}</div>
          <div class="card-titulo">${e.titulo}</div>
          <div class="card-meta"><span class="tag ${sc(e.status)}">${e.status||'—'}</span>${e.capital_interior?`<span class="tag">${e.capital_interior}</span>`:''}</div>
          <div class="card-datas">📅 ${e.data_abertura?fmtDate(e.data_abertura):'—'}${e.data_encerramento?' → '+fmtDate(e.data_encerramento):''}</div>
          <div class="card-info" style="margin-top:6px;font-size:11px;color:var(--primary);font-weight:600">👤 Assistentes: ${getAssistenteNomes(e)}</div>
          ${getEquipeCardText(e) ? `<div class="card-info" style="margin-top:2px;font-size:11px;opacity:0.8">${getEquipeCardText(e)}</div>` : ''}
        </div>`).join('')}
    </div>`
}

async function loadAberturas() {
  const el = document.getElementById('aberturas-container');
  const queryStr = '*, unidades(nome), unidade_espacos(nome), exposicao_assistentes(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))'
  const { data: rawData, error } = await db.from('exposicoes')
    .select(queryStr)
    .not('status', 'in', '("Encerrada","Cancelada","Suspensa")')
    .not('data_abertura', 'is', null)
    .order('data_abertura');
  
  if (error) { console.error('Erro ao carregar aberturas:', error); return; }
  if (!rawData?.length) { el.innerHTML = `<div class="empty-state"><p>Nenhuma abertura programada</p></div>`; return; }
  
  // Remover duplicatas por Título + Unidade (caso existam registros duplicados no banco)
  const data = Array.from(new Map(rawData.map(item => [`${item.titulo}-${item.unidade_id}`, item])).values());
  
  // Sincronizar com global para permitir edição no painel
  allExposicoes = data
  const today = new Date();
  let startMonth = today.getMonth();
  
  for (let i = data.length - 1; i >= 0; i--) {
     if (data[i].status === 'Aberta' || data[i].status === 'Em produção') {
        const d = new Date(data[i].data_abertura + 'T12:00:00');
        if (d.getFullYear() === today.getFullYear() && d.getMonth() < startMonth) {
           startMonth = d.getMonth();
        }
        break;
     }
  }

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let html = '';

  for (let m = startMonth; m <= 11; m++) {
      const expsMes = data.filter(e => {
          const dt = new Date(e.data_abertura + 'T12:00:00');
          return dt.getMonth() === m && dt.getFullYear() === today.getFullYear();
      });

      html += `
        <div style="margin-bottom:32px">
           <h3 style="font-family:'Fraunces',serif;font-size:18px;font-weight:400;margin-bottom:12px;color:var(--primary);border-bottom:1px solid var(--border);padding-bottom:8px">${MESES[m]}</h3>
      `;

      if (expsMes.length === 0) {
          html += `<div style="color:var(--muted);font-size:13px;padding:8px 0;">Nenhuma abertura prevista.</div></div>`;
          continue;
      }

      html += `<table class="data-table" style="margin-bottom:0">
                 <thead><tr><th style="width:100px">Abertura</th><th style="width:120px">Unidade</th><th style="width:250px">Exposição</th><th>Assistentes</th></tr></thead>
                 <tbody>`;
      
      expsMes.forEach(e => {
          const descStr = e.sinopse || e.notas_adicionais || '';
          const sinopse = descStr.length > 120 ? descStr.substring(0, 120) + '...' : descStr;
          const desc = sinopse ? `<div style="font-size:11px;color:var(--muted);white-space:normal;margin-top:4px">${sinopse}</div>` : '';
          
          html += `
            <tr onclick="openPainel('${e.id}')">
              <td style="font-weight:600;white-space:nowrap">${fmtDate(e.data_abertura)}</td>
              <td>${e.unidades?.nome||'—'}</td>
              <td><strong>${e.titulo}</strong>${desc}</td>
              <td style="color:var(--primary);font-size:12px">👤 ${getAssistenteNomes(e)}</td>
            </tr>`;
      });
      html += `</tbody></table></div>`;
  }
  
  el.innerHTML = html;
}

function fmtDate(s) { if(!s) return '—'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}` }
function showToast(msg, isError=false) {
  const t = document.getElementById('toast')
  t.textContent = msg; t.className = isError ? 'show error' : 'show'
  setTimeout(() => t.className = '', 3000)
}

// ══════════════════════════════════════════
// PAINEL LATERAL
// ══════════════════════════════════════════

const ETAPAS_CONFIG = [
  { key: 'pre', label: 'Pré-Produção e Contratos' },
  { key: 'projetos', label: 'Projetos e Licitações' },
  { key: 'execucao', label: 'Execução e Montagem' },
  { key: 'pos', label: 'Finalização e Prestação' }
]

const TAREFAS_SPEC = [
  // PRÉ-PRODUÇÃO
  { nome: 'DCA de mérito aprovado', etapa: 'pre', offset: -240 },
  { nome: 'Contratação da pré-produção', etapa: 'pre', offset: -210 },
  { nome: 'Contratação de arquiteto', etapa: 'pre', offset: -180 },
  { nome: 'Contratação de curadoria', etapa: 'pre', offset: -180 },
  { nome: 'Contratação de designer', etapa: 'pre', offset: -170 },
  { nome: 'Contratação da coordenação do educativo', etapa: 'pre', offset: -160 },
  { nome: 'Entrega da lista de obras', etapa: 'pre', offset: -150 },
  
  // PROJETOS E LICITAÇÕES
  { nome: 'DCA de contratação da produção', etapa: 'projetos', offset: -120 },
  { nome: 'Entrega do memorial de arquitetura', etapa: 'projetos', offset: -120 },
  { nome: 'Entrega do projeto de iluminação', etapa: 'projetos', offset: -120 },
  { nome: 'DCA de licitação de cenotecnia', etapa: 'projetos', offset: -90 },
  { nome: 'DCA de licitação de iluminação', etapa: 'projetos', offset: -90 },
  { nome: 'DCA de licitação de audiovisual', etapa: 'projetos', offset: -90 },
  { nome: 'DCA de licitação de transporte e seguro', etapa: 'projetos', offset: -80 },
  { nome: 'Assinar contrato de cenotecnia', etapa: 'projetos', offset: -45 },
  { nome: 'Entrega do projeto gráfico / design', etapa: 'projetos', offset: -60 },
  { nome: 'Aprovar materiais gráficos', etapa: 'projetos', offset: -40 },
  
  // EXECUÇÃO E MONTAGEM
  { nome: ' DCA de contratação da equipe educativa', etapa: 'execucao', offset: -40 },
  { nome: 'Assinar contrato de educativo', etapa: 'execucao', offset: -30 },
  { nome: 'Recebimento de obras e materiais', etapa: 'execucao', offset: -25 },
  { nome: 'Início da construção cenográfica', etapa: 'execucao', offset: -25 },
  { nome: 'Montagem fina', etapa: 'execucao', offset: -22 },
  { nome: 'Instalação de iluminação e audiovisual', etapa: 'execucao', offset: -15 },
  { nome: 'Revisão de legendas e textos', etapa: 'execucao', offset: -10 },
  { nome: 'Registro fotográfico da montagem', etapa: 'execucao', offset: -5 },
  { nome: 'Inauguração / Abertura', etapa: 'execucao', offset: 0 },
  
  // FINALIZAÇÃO (Pós-Encerramento)
  { nome: 'Início da desmontagem', etapa: 'pos', offset: 1, ref: 'fim' },
  { nome: 'Devolução de obras emprestadas', etapa: 'pos', offset: 15, ref: 'fim' },
  { nome: 'Retirada de materiais cenográficos', etapa: 'pos', offset: 20, ref: 'fim' },
  { nome: 'Relatório de público', etapa: 'pos', offset: 30, ref: 'fim' },
  { nome: 'Relatório de educativo', etapa: 'pos', offset: 60, ref: 'fim' },
  { nome: 'Prestação de contas financeira', etapa: 'pos', offset: 90, ref: 'fim' },
  { nome: 'Avaliação interna da produção', etapa: 'pos', offset: 90, ref: 'fim' },
  { nome: 'Arquivamento de documentação', etapa: 'pos', offset: 90, ref: 'fim' }
]

let painelExpId = null
let painelTarefas = []
let painelEquipe = []

async function openPainel(id) {
  const isSec = currentProfile?.perfil === 'secretaria'
  painelExpId = id
  let e = allExposicoes.find(x => x.id == id) || arquivoDados.find(x => x.id == id)
  
  if (!e) {
    const q = '*, unidades(nome), unidade_espacos(nome), exposicao_assistentes(usuario_id), exposicao_colaboradores(papel, colaboradores(nome))'
    const { data, error } = await db.from('exposicoes').select(q).eq('id', id).single()
    if (error || !data) { console.error('Exposição não encontrada:', id); return }
    e = data
  }

  document.getElementById('painel-unidade').innerHTML = `${e.unidades?.nome || '—'} ${e.unidade_espacos?.nome ? `<span class="unit-space-badge">${e.unidade_espacos.nome}</span>` : ''}`
  document.getElementById('painel-titulo').textContent = e.titulo

  const metaEl = document.getElementById('painel-meta')
  metaEl.innerHTML = `
    <span class="tag ${sc(e.status)}" style="opacity:1.0; padding:6px 12px; font-size:12px;">${e.status || '—'}</span>
    ${e.semestre ? `<span style="font-size:15px; opacity:0.85; font-weight:500;">${e.semestre}</span>` : ''}
    ${e.capital_interior ? `<span style="font-size:15px; opacity:0.85; font-weight:500;">${e.capital_interior}</span>` : ''}
    ${e.data_abertura ? `<span style="font-size:15px; opacity:0.9; font-weight:600;">📅 ${fmtDate(e.data_abertura)}${e.data_encerramento?' → '+fmtDate(e.data_encerramento):''}</span>` : (e.periodo_previsto ? `<span style="font-size:15px;opacity:0.9;font-weight:600;">📅 ${e.periodo_previsto}</span>` : '')}
    ${e.valor_estimado ? `<span style="font-size:14px; opacity:1.0; font-weight:800; color:#000; background:#a7f3d0; padding:4px 10px; border-radius:6px; margin-left:8px; letter-spacing:0.5px;">💰 ${isSec ? '<span style="font-size:10px">RESTRITO</span>' : fmtMoney(e.valor_estimado)}</span>` : ''}
  `

  document.getElementById('painel-assistentes').innerHTML = e.exposicao_assistentes?.length ? `👤 Assistentes: ${getAssistenteNomes(e)}` : '';


  // Buscar equipe vinculada
  const { data: equipeData } = await db.from('exposicao_colaboradores')
    .select('papel, colaboradores(id, nome, funcao)')
    .eq('exposicao_id', id)
    .order('papel')
  painelEquipe = equipeData || []

  renderPainelDados(e)
  loadPainelCronograma(e)

  document.getElementById('painel-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closePainel() {
  document.getElementById('painel-overlay').classList.remove('open')
  document.body.style.overflow = ''
  painelExpId = null
}

function setActiveTab(tab) {
  document.querySelectorAll('.painel-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab))
  document.querySelectorAll('.painel-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab))
}

document.querySelectorAll('.painel-tab').forEach(t =>
  t.addEventListener('click', () => setActiveTab(t.dataset.tab))
)
document.getElementById('btn-painel-fechar').addEventListener('click', closePainel)
document.getElementById('painel-overlay').addEventListener('click', ev => {
  if (ev.target === document.getElementById('painel-overlay')) closePainel()
})
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closePainel() })
document.getElementById('btn-painel-editar').addEventListener('click', async () => {
  if (!painelExpId) return
  const id = painelExpId
  closePainel()
  await openExpModal(id)
})

// ── CRONOGRAMA ──

async function loadPainelCronograma(exp) {
  const cronDiv = document.getElementById('painel-cron-content')
  const loadDiv = document.getElementById('painel-cron-loading')
  cronDiv.style.display = 'none'; loadDiv.style.display = 'block'
  const { data } = await db.from('tarefas').select('*').eq('exposicao_id', exp.id).order('data_prevista')
  painelTarefas = data || []
  loadDiv.style.display = 'none'; cronDiv.style.display = 'block'
  renderCronogramaHeader(exp)
  renderCronograma(exp)
}

function renderCronogramaHeader(exp) {
  const headerDiv = document.getElementById('painel-cron-header')
  if (!headerDiv) return
  const isCons = currentProfile?.perfil === 'consultor'
  headerDiv.innerHTML = `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Período da Exposição</div>
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end">
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Abertura</label>
          <input type="date" id="cron-abertura" value="${exp.data_abertura||''}" 
            style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Sans',sans-serif;font-size:13px;background:#fff"
            ${isCons ? 'disabled' : ''}>
        </div>
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Encerramento</label>
          <input type="date" id="cron-encerramento" value="${exp.data_encerramento||''}"
            style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Sans',sans-serif;font-size:13px;background:#fff"
            ${isCons ? 'disabled' : ''}>
        </div>
        ${!isCons ? `<button onclick="salvarDatasEGerar()" class="btn-gerar-cronograma" style="margin-bottom:0;white-space:nowrap">
          ⚙️ ${painelTarefas.length ? 'Regenerar' : 'Gerar Cronograma'}
        </button>` : ''}
      </div>
    </div>
  `
}

async function salvarDatasEGerar() {
  const abertura = document.getElementById('cron-abertura').value
  const encerramento = document.getElementById('cron-encerramento').value
  if (!abertura) { showToast('Informe a data de abertura', true); return }
  // Salvar datas no banco
  const { error } = await db.from('exposicoes').update({
    data_abertura: abertura || null,
    data_encerramento: encerramento || null
  }).eq('id', painelExpId)
  if (error) { showToast('Erro ao salvar datas', true); return }
  // Atualizar local
  const exp = allExposicoes.find(x => x.id === painelExpId) || arquivoDados.find(x => x.id == painelExpId)
  if (exp) { exp.data_abertura = abertura; exp.data_encerramento = encerramento }
  if (painelTarefas.length && !confirm('Isso vai apagar e recriar todas as tarefas. Continuar?')) return
  await gerarCronograma()
}

function renderCronograma(exp) {
  const cronDiv = document.getElementById('painel-cron-content')
  const temTarefas = painelTarefas.length > 0
  let html = ''

  if (temTarefas) {
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <span style="font-size:13px;color:var(--muted)">${painelTarefas.filter(t=>t.status==='concluida').length} de ${painelTarefas.length} tarefas concluídas</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 100px 130px 120px 40px;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);margin-bottom:16px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em">
      <div>Tarefa</div>
      <div>Data Ideal</div>
      <div>Data Real</div>
      <div>Status</div>
      <div>Obs</div>
    </div>`

    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const porEtapa = {}
    ETAPAS_CONFIG.forEach(et => { porEtapa[et.key] = [] })
    painelTarefas.forEach(t => { (porEtapa[t.etapa] ? porEtapa[t.etapa] : porEtapa['pre']).push(t) })

    ETAPAS_CONFIG.forEach(et => {
      const tarefas = porEtapa[et.key]
      if (!tarefas.length) return
      const concluidas = tarefas.filter(t => t.status === 'concluida').length
      html += `<div class="etapa-grupo">
        <div class="etapa-titulo">${et.label} <span class="etapa-badge">${concluidas}/${tarefas.length}</span></div>`
      tarefas.forEach(t => {
        const atrasada = t.data_prevista && new Date(t.data_prevista+'T00:00:00') < hoje && t.status !== 'concluida'
        html += `<div class="tarefa-row ${atrasada?'tarefa-atrasada':''}" style="display:grid;grid-template-columns:1fr 100px 130px 120px 40px;gap:12px;align-items:center">
          <div class="tarefa-nome">${t.nome}</div>
          <div class="tarefa-data">${t.data_prevista ? fmtDate(t.data_prevista) : '—'}</div>
          <div>
            <input type="date" value="${t.data_real||''}" onchange="updateTarefaDataReal('${t.id}',this.value)"
              style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-family:'DM Sans',sans-serif;font-size:11px;background:#fff;color:var(--text);margin-top:2px;">
          </div>
          <select class="tarefa-status-sel" onchange="updateTarefaStatus('${t.id}',this.value)">
            <option ${t.status==='pendente'?'selected':''}>pendente</option>
            <option ${t.status==='em_andamento'?'selected':''}>em_andamento</option>
            <option ${t.status==='concluida'?'selected':''}>concluida</option>
            <option ${t.status==='atrasada'?'selected':''}>atrasada</option>
          </select>
          <button class="tarefa-obs-btn ${t.observacoes?'has-obs':''}" title="${t.observacoes||'Adicionar observação'}" onclick="editarObsTarefa('${t.id}')">💬</button>
        </div>`
      })
      html += `</div>`
    })
  }
  cronDiv.innerHTML = html
}

async function gerarCronograma() {
  const exp = allExposicoes.find(x => x.id === painelExpId)
  if (!exp || !exp.data_abertura) return
  const btn = document.getElementById('btn-gerar-cron')
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...' }

  await db.from('tarefas').delete().eq('exposicao_id', exp.id)

  const abertura = new Date(exp.data_abertura + 'T12:00:00')
  const encerramento = exp.data_encerramento ? new Date(exp.data_encerramento + 'T12:00:00') : new Date(abertura.getTime() + 60*24*60*60*1000)
  
  const toInsert = TAREFAS_SPEC.map(spec => {
    const base = spec.ref === 'fim' ? encerramento : abertura
    const data = new Date(base)
    data.setDate(data.getDate() + spec.offset)
    
    return {
      exposicao_id: exp.id,
      nome: spec.nome,
      etapa: spec.etapa,
      data_prevista: data.toISOString().split('T')[0],
      status: 'pendente'
    }
  })

  const { error } = await db.from('tarefas').insert(toInsert)
  if (error) { showToast('Erro ao gerar: ' + error.message, true); return }
  showToast(`✅ ${toInsert.length} tarefas criadas!`)
  await loadPainelCronograma(exp)
}

async function updateTarefaStatus(id, status) {
  await db.from('tarefas').update({ status }).eq('id', id)
  const t = painelTarefas.find(x => x.id === id)
  if (t) t.status = status
  const exp = allExposicoes.find(x => x.id === painelExpId)
  if (exp) renderCronograma(exp)
}

async function updateTarefaDataReal(id, dataRealVal) {
  const data = dataRealVal || null
  await db.from('tarefas').update({ data_real: data }).eq('id', id)
  const t = painelTarefas.find(x => x.id === id)
  if (t) t.data_real = data
}

async function editarObsTarefa(id) {
  const t = painelTarefas.find(x => x.id === id)
  if (!t) return
  const nova = prompt('Observação para esta tarefa:', t.observacoes || '')
  if (nova === null) return
  await db.from('tarefas').update({ observacoes: nova || null }).eq('id', id)
  t.observacoes = nova || null
  const exp = allExposicoes.find(x => x.id === painelExpId)
  if (exp) renderCronograma(exp)
}

// ── DADOS ──

function fmtVal(v) {
  return (v !== null && v !== undefined && v !== '') ? v : '<span class="vazio">—</span>'
}
function fmtMoney(v) { return v ? 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'R$ 0,00' }

function getMesesDoTexto(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const mesesCurto = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  
  let primeiro = -1, ultimo = -1;
  meses.forEach((m, idx) => {
    if (t.includes(m) || t.includes(mesesCurto[idx])) {
      if (primeiro === -1) primeiro = idx;
      ultimo = idx;
    }
  });
  return primeiro !== -1 ? { inicio: primeiro, fim: ultimo } : null;
}

function renderPainelDados(e) {
  const el = document.getElementById('painel-dados-content')
  const linha = (label, val) => `<div class="dados-item"><div class="dados-label">${label}</div><div class="dados-valor">${val}</div></div>`

  // Montar seção equipe a partir de painelEquipe
  const isSec = currentProfile?.perfil === 'secretaria'
  const porPapel = {}
  painelEquipe.forEach(ec => {
    if (!porPapel[ec.papel]) porPapel[ec.papel] = []
    if (ec.colaboradores) porPapel[ec.papel].push(ec.colaboradores.nome)
  })
  const mapValores = {
    'Curador(a)': { label: 'Cachê / Contrato', val: e.cache_curadoria, isMoney: true },
    'Produção': { label: 'Contrato', val: e.contrato_producao, isMoney: false },
    'Arquiteto(a)': { label: 'Contrato', val: e.contrato_arquitetura, isMoney: false },
    'Educativo': { label: 'Contrato', val: e.contrato_educativo, isMoney: false },
    'Acessibilidade': { label: 'Contrato', val: e.acessibilidade, isMoney: false },
    'Empresa de Cenotecnia': { label: 'Orçamento', val: e.valor_cenotecnia, isMoney: true }
  }

  const rolesSet = new Set(Object.keys(porPapel))
  Object.keys(mapValores).forEach(k => {
    if (mapValores[k].val || mapValores[k].val === 0) rolesSet.add(k)
  })

  // Ordenar funções (tentar manter Curador, Produtor, Arquiteto primeiro)
  const ordem = ['Curador(a)', 'Produção', 'Arquiteto(a)', 'Educativo', 'Empresa de Cenotecnia']
  const sortedRoles = Array.from(rolesSet).sort((a, b) => {
    const idxA = ordem.indexOf(a); const idxB = ordem.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  })

  const equipeHtml = sortedRoles.map(papel => {
    const nomes = porPapel[papel] ? porPapel[papel].join(', ') : '<span style="color:var(--muted);font-style:italic;font-size:12px;font-weight:400">Não informado</span>'
    const vInfo = mapValores[papel]
    const valStr = (vInfo && vInfo.val !== null && vInfo.val !== undefined && vInfo.val !== '') 
      ? `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px">${vInfo.label}</span>
          <span style="font-family:'Fraunces',serif; font-size:15px; color:var(--primary); font-weight:500;">${isSec ? '<span style="font-size:10px;color:var(--muted)">RESTRITO</span>' : (vInfo.isMoney ? fmtMoney(vInfo.val) : vInfo.val)}</span>
        </div>`
      : ''
    return `<div class="contrato-card" style="padding:16px;">
              <div class="contrato-label">${papel}</div>
              <div style="font-size:14px; font-weight:500; color:var(--text); line-height:1.4">${nomes}</div>
              ${valStr}
            </div>`
  }).join('')

  // Bloco de Visitação/Público
  const temVisitacao = e.visitas_expo_meta || e.visitas_expo_estatistico || e.visitas_mediadas_meta || e.visitas_mediadas_estatistico
  const visitacaoHtml = temVisitacao ? `
    <div class="dados-secao">
      <div class="dados-secao-titulo">Visitação e Público</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:8px">Visitas à Exposição</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:12px;color:var(--muted)">Meta</span>
            <span style="font-family:'Fraunces',serif;font-size:18px">${e.visitas_expo_meta ? e.visitas_expo_meta.toLocaleString('pt-BR') : '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--muted)">Estatístico</span>
            <span style="font-family:'Fraunces',serif;font-size:18px;color:${e.visitas_expo_estatistico >= (e.visitas_expo_meta||0) && e.visitas_expo_meta ? '#166534' : 'var(--text)'}">${e.visitas_expo_estatistico ? e.visitas_expo_estatistico.toLocaleString('pt-BR') : '—'}</span>
          </div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:8px">Visitas Mediadas</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:12px;color:var(--muted)">Meta</span>
            <span style="font-family:'Fraunces',serif;font-size:18px">${e.visitas_mediadas_meta ? e.visitas_mediadas_meta.toLocaleString('pt-BR') : '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--muted)">Estatístico</span>
            <span style="font-family:'Fraunces',serif;font-size:18px;color:${e.visitas_mediadas_estatistico >= (e.visitas_mediadas_meta||0) && e.visitas_mediadas_meta ? '#166534' : 'var(--text)'}">${e.visitas_mediadas_estatistico ? e.visitas_mediadas_estatistico.toLocaleString('pt-BR') : '—'}</span>
          </div>
        </div>
      </div>
    </div>` : ''

  el.innerHTML = `
    ${e.sinopse ? `<div class="dados-secao"><div class="dados-secao-titulo">Sinopse</div><div style="font-size:13px;line-height:1.7;white-space:pre-wrap">${e.sinopse}</div></div>` : ''}
    <div class="dados-secao">
      <div class="dados-secao-titulo">Equipe e Contratos</div>
      <div class="contratos-container">
        ${equipeHtml || '<span class="dados-valor vazio">Nenhuma equipe ou contrato registrado.</span>'}
      </div>
    </div>
    ${visitacaoHtml}
    ${e.notas_adicionais ? `<div class="dados-secao"><div class="dados-secao-titulo">Notas adicionais</div><div style="font-size:13px;line-height:1.7;white-space:pre-wrap">${e.notas_adicionais}</div></div>` : ''}
    ${e.referencias_links ? `<div class="dados-secao"><div class="dados-secao-titulo">Referências / Links</div><div style="font-size:13px">${e.referencias_links}</div></div>` : ''}
  `
}

// ── HISTÓRICO ──

async function salvarHistorico() {
  if (!painelExpId) return
  const txt = document.getElementById('painel-historico-txt').value
  const { error } = await db.from('exposicoes').update({ historico_abertura: txt || null }).eq('id', painelExpId)
  if (error) { showToast('Erro ao salvar', true); return }
  const exp = allExposicoes.find(x => x.id === painelExpId) || arquivoDados.find(x => x.id == painelExpId)
  if (exp) exp.historico_abertura = txt || null
  showToast('Ficha técnica salva!')
}

// ── ADMIN ──

async function loadAdmin() {
  const container = document.getElementById('admin-users-container')
  container.innerHTML = `<div class="loading">Carregando usuários...</div>`
  
  const { data: users, error } = await db.from('usuarios').select('*').order('nome')
  if (error) { showToast('Erro ao carregar usuários', true); return }
  
  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Perfil / Acesso</th>
          <th>Última Atividade</th>
        </tr>
      </thead>
      <tbody>
  `
  
  users.forEach(u => {
    const isMe = u.id === currentUser.id
    const dataAcesso = u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'Sem registro'
    
    html += `
      <tr>
        <td>
          <div style="font-weight:600">${u.nome} ${isMe ? '<small>(Você)</small>' : ''}</div>
          <div style="font-size:11px; color:var(--muted)">${u.email}</div>
        </td>
        <td>
          <select class="admin-role-sel" onchange="updateUsuarioPerfil('${u.id}', this.value)" ${isMe ? 'disabled' : ''}>
            <option value="gestor" ${u.perfil==='gestor'?'selected':''}>Gestor</option>
            <option value="assistente" ${u.perfil==='assistente'?'selected':''}>Assistente</option>
            <option value="secretaria" ${u.perfil==='secretaria'?'selected':''}>Secretaria</option>
            <option value="consultor" ${u.perfil==='consultor'?'selected':''}>Consultor</option>
          </select>
        </td>
        <td class="last-access">${dataAcesso}</td>
      </tr>
    `
  })
  
  html += `</tbody></table>`
  container.innerHTML = html
}

async function updateUsuarioPerfil(userId, novoPerfil) {
  const { error } = await db.from('usuarios').update({ perfil: novoPerfil }).eq('id', userId)
  if (error) {
    showToast('Erro ao atualizar perfil', true)
    loadAdmin()
    return
  }
  showToast('Perfil atualizado com sucesso!')
}

init()
