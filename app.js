    // ================== DADOS E CONFIGURAÇÕES ==================
const diasNomes = { seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI', sex: 'SEX', sab: 'SAB', dom: 'DOM' };
const diasOrdem = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
let diasSelecionados = JSON.parse(localStorage.getItem('diasTreino')) || ['seg', 'ter', 'qua', 'qui', 'sex'];
let diaAtual = diasSelecionados[0] || 'seg';
let exerciciosPorDia = JSON.parse(localStorage.getItem('exercicios')) || {};
let historicoPeso = JSON.parse(localStorage.getItem('historicoPeso')) || [];
let cronometroAtivo = false;
let tempoRestante = 90;
let cronometroInterval;
let metaPeso = JSON.parse(localStorage.getItem('metaPeso')) || null;

// ================== INICIALIZAÇÃO ==================
document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    renderizarDias();
    carregarDia();
    carregarDadosUsuario();
    carregarHistoricoPeso();
    atualizarCronometroDisplay();
    renderizarDiasTreinoCheckboxes();
    atualizarVisualizacaoMeta();
});

// ================== EVENTOS ==================
function configurarEventos() {
    document.querySelectorAll('.aba').forEach(aba => {
        aba.addEventListener('click', () => {
            document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
            document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('ativa'));
            aba.classList.add('ativa');
            document.getElementById('aba-' + aba.dataset.aba).classList.add('ativa');
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('dia-btn')) {
            diaAtual = e.target.dataset.dia;
            carregarDia();
        }
    });

    const btnAdicionar = document.getElementById('btnAdicionarExercicio');
    if (btnAdicionar) btnAdicionar.addEventListener('click', adicionarExercicio);

    const btnIniciar = document.getElementById('btnIniciar');
    if (btnIniciar) btnIniciar.addEventListener('click', alternarCronometro);

    const btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', resetarCronometro);

    const btnCalc = document.getElementById('btnCalcular');
    if (btnCalc) btnCalc.addEventListener('click', calcularDados);

    const btnSalvarMeta = document.getElementById('btnSalvarMeta');
    if (btnSalvarMeta) btnSalvarMeta.addEventListener('click', salvarMetaPeso);

    const btnResetMeta = document.getElementById('btnResetMeta');
    if (btnResetMeta) btnResetMeta.addEventListener('click', resetarMetaPeso);

    const btnRegistrarPeso = document.getElementById('btnRegistrarPeso');
    if (btnRegistrarPeso) btnRegistrarPeso.addEventListener('click', registrarPesoHoje);

    const btnSalvarDias = document.getElementById('btnSalvarDias');
    if (btnSalvarDias) btnSalvarDias.addEventListener('click', salvarDiasTreino);
}

// ================== DIAS DA SEMANA ==================
function renderizarDias() {
    const container = document.getElementById('diasSemana');
    if (!container) return;
    container.innerHTML = '';
    diasSelecionados.forEach(dia => {
        const btn = document.createElement('button');
        btn.className = `dia-btn ${dia === diaAtual ? 'ativa' : ''}`;
        btn.dataset.dia = dia;
        btn.textContent = diasNomes[dia];
        container.appendChild(btn);
    });
}

// ================== CARREGAR DIA ==================
function carregarDia() {
    document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('ativa'));
    document.querySelector(`[data-dia="${diaAtual}"]`)?.classList.add('ativa');
    if (!exerciciosPorDia[diaAtual]) exerciciosPorDia[diaAtual] = [];
    renderizarExercicios();
}

// ================== ADICIONAR EXERCÍCIO ==================
function adicionarExercicio() {
    const nome = prompt('Nome do exercício:');
    if (!nome) return;
    const series = parseInt(prompt('Número de séries:'));
    if (!series || series < 1) return;

    const exercicio = {
        id: Date.now(),
        nome: nome,
        totalSeries: series,
        series: []
    };

    for (let i = 1; i <= series; i++) {
        exercicio.series.push({
            numero: i,
            repeticoes: ''
        });
    }

    exerciciosPorDia[diaAtual].push(exercicio);
    salvarExercicios();
    renderizarExercicios();
}

// ================== RENDERIZAR EXERCÍCIOS COM CAMPOS PARA ANOTAR ==================
function renderizarExercicios() {
    const container = document.getElementById('listaExercicios');
    if (!container) return;
    container.innerHTML = '';
    const lista = exerciciosPorDia[diaAtual] || [];

    if (lista.length === 0) {
        container.innerHTML = `<div class="vazio"><i class="fas fa-dumbbell"></i><p>Nenhum exercício para este dia.<br>Clique em "Adicionar Exercício" para começar!</p></div>`;
        return;
    }

    lista.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercicio-card';
        
        let seriesHTML = ex.series.map(s => `
            <div style="display:flex; align-items:center; gap:8px; margin:4px 0;">
                <span style="min-width:60px;">Série ${s.numero}:</span>
                <input type="number" 
                       class="input-reps" 
                       data-exercicio="${ex.id}" 
                       data-serie="${s.numero}" 
                       value="${s.repeticoes}" 
                       placeholder="Reps"
                       style="width:80px; padding:6px; background:#374151; border:none; border-radius:4px; color:#fff; text-align:center;">
                <span style="color:#aaa;">rep</span>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="exercicio-cabecalho">
                <h4>${ex.nome}</h4>
                <button class="btn-excluir" data-id="${ex.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="series-lista">
                ${seriesHTML}
            </div>
        `;
        container.appendChild(card);
    });

    // Salvar quando digitar nas repetições
    document.querySelectorAll('.input-reps').forEach(input => {
        input.addEventListener('input', (e) => {
            const exId = parseInt(e.target.dataset.exercicio);
            const serieNum = parseInt(e.target.dataset.serie);
            const valor = e.target.value;
            salvarRepeticao(exId, serieNum, valor);
        });
    });

    // Excluir exercício
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            exerciciosPorDia[diaAtual] = exerciciosPorDia[diaAtual].filter(e => e.id !== id);
            salvarExercicios();
            renderizarExercicios();
        });
    });
}

function salvarRepeticao(exercicioId, serieNum, valor) {
    const exercicio = exerciciosPorDia[diaAtual].find(e => e.id === exercicioId);
    if (exercicio) {
        const serie = exercicio.series.find(s => s.numero === serieNum);
        if (serie) {
            serie.repeticoes = valor;
            salvarExercicios();
        }
    }
}

function salvarExercicios() {
    localStorage.setItem('exercicios', JSON.stringify(exerciciosPorDia));
}

// ================== CRONÔMETRO ==================
function atualizarCronometroDisplay() {
    const el = document.getElementById('cronometro');
    if (!el) return;
    const min = Math.floor(tempoRestante / 60);
    const seg = tempoRestante % 60;
    el.textContent = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

function alternarCronometro() {
    const btn = document.getElementById('btnIniciar');
    if (!btn) return;
    if (cronometroAtivo) {
        clearInterval(cronometroInterval);
        cronometroAtivo = false;
        btn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
    } else {
        cronometroAtivo = true;
        btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        cronometroInterval = setInterval(() => {
            tempoRestante--;
            atualizarCronometroDisplay();
            if (tempoRestante <= 0) {
                clearInterval(cronometroInterval);
                cronometroAtivo = false;
                btn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
                alert('⏱️ Tempo esgotado!');
            }
        }, 1000);
    }
}

function resetarCronometro() {
    clearInterval(cronometroInterval);
    cronometroAtivo = false;
    tempoRestante = 90;
    atualizarCronometroDisplay();
    const btn = document.getElementById('btnIniciar');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
}

// ================== CALCULADORA TMB ==================
function calcularDados() {
    const peso = parseFloat(document.getElementById('calcPeso').value);
    const altura = parseInt(document.getElementById('calcAltura').value);
    const idade = parseInt(document.getElementById('calcIdade').value);
    const sexo = document.getElementById('calcSexo').value;
    const atividade = parseFloat(document.getElementById('calcAtividade').value);

    if (!peso || !altura || !idade) {
        alert('Preencha todos os campos!');
        return;
    }

    let tmb;
    if (sexo === 'masc') {
        tmb = Math.round(88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * idade));
    } else {
        tmb = Math.round(447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * idade));
    }

    const gastoDiario = Math.round(tmb * atividade);
    const agua = (peso * 35).toFixed(0);

    document.getElementById('resultadoTMB').textContent = tmb + ' kcal';
    document.getElementById('resultadoGasto').textContent = gastoDiario + ' kcal/dia';
    document.getElementById('resultadoAgua').textContent = (agua / 1000).toFixed(1) + ' L/dia';
    document.getElementById('resultados').style.display = 'block';

    localStorage.setItem('dadosUsuario', JSON.stringify({ peso, altura, idade, sexo, atividade }));
}

function carregarDadosUsuario() {
    const dados = JSON.parse(localStorage.getItem('dadosUsuario'));
    if (dados) {
        document.getElementById('calcPeso').value = dados.peso || '';
        document.getElementById('calcAltura').value = dados.altura || '';
        document.getElementById('calcIdade').value = dados.idade || '';
        document.getElementById('calcSexo').value = dados.sexo || 'masc';
        document.getElementById('calcAtividade').value = dados.atividade || '1.2';
    }
}

// ================== DIAS DE TREINO ==================
function renderizarDiasTreinoCheckboxes() {
    const container = document.getElementById('diasTreinoCheckboxes');
    if (!container) return;
    container.innerHTML = '';
    diasOrdem.forEach(dia => {
        const div = document.createElement('label');
        div.className = 'dia-checkbox';
        div.innerHTML = `<input type="checkbox" value="${dia}" ${diasSelecionados.includes(dia) ? 'checked' : ''}> ${diasNomes[dia]}`;
        container.appendChild(div);
    });
}

function salvarDiasTreino() {
    const checkboxes = document.querySelectorAll('#diasTreinoCheckboxes input:checked');
    diasSelecionados = Array.from(checkboxes).map(cb => cb.value);
    if (diasSelecionados.length === 0) {
        alert('Selecione pelo menos 1 dia!');
        return;
    }
    if (!diasSelecionados.includes(diaAtual)) diaAtual = diasSelecionados[0];
    localStorage.setItem('diasTreino', JSON.stringify(diasSelecionados));
    renderizarDias();
    carregarDia();
    alert('✅ Dias salvos!');
}

// ================== META DE PESO ==================
function salvarMetaPeso() {
    const inicial = parseFloat(document.getElementById('pesoInicial').value);
    const alvo = parseFloat(document.getElementById('pesoAlvo').value);
    const prazo = parseInt(document.getElementById('prazoDias').value);

    if (!inicial || !alvo || !prazo) {
        alert('Preencha todos os campos da meta!');
        return;
    }

    metaPeso = { pesoInicial: inicial, pesoAlvo: alvo, prazoDias: prazo, dataCriacao: new Date().toISOString() };
    localStorage.setItem('metaPeso', JSON.stringify(metaPeso));
    atualizarVisualizacaoMeta();
    alert('✅ Meta salva!');
}

function resetarMetaPeso() {
    if (!confirm('Tem certeza que deseja apagar a meta atual?')) return;
    metaPeso = null;
    localStorage.removeItem('metaPeso');
    document.getElementById('pesoInicial').value = '';
    document.getElementById('pesoAlvo').value = '';
    document.getElementById('prazoDias').value = '';
    atualizarVisualizacaoMeta();
}

function registrarPesoHoje() {
    const peso = parseFloat(document.getElementById('pesoHoje').value);
    if (!peso) {
        alert('Digite o peso!');
        return;
    }
    const hoje = new Date().toLocaleDateString('pt-BR');
    historicoPeso.push({ data: hoje, peso: peso });
    localStorage.setItem('historicoPeso', JSON.stringify(historicoPeso));
    document.getElementById('pesoHoje').value = '';
    carregarHistoricoPeso();
    atualizarVisualizacaoMeta();
}

function carregarHistoricoPeso() {
    const container = document.getElementById('listaHistoricoPeso');
    if (!container) return;
    container.innerHTML = '';
    if (historicoPeso.length === 0) {
        container.innerHTML = '<p class="vazio-texto">Nenhum peso registrado ainda.</p>';
        return;
    }
    [...historicoPeso].reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'historico-item';
        div.innerHTML = `<span>${item.data}</span><strong>${item.peso.toFixed(1)} kg</strong>`;
        container.appendChild(div);
    });
}

function atualizarVisualizacaoMeta() {
    const container = document.getElementById('progressoMeta');
    if (!container) return;
    if (!metaPeso) {
        container.innerHTML = '<p class="sem-meta">Nenhuma meta definida.<br>Defina sua meta acima!</p>';
        return;
    }

    const pesoAtual = historicoPeso.length > 0 ? historicoPeso[historicoPeso.length - 1].peso : metaPeso.pesoInicial;
    const variacaoPeso = metaPeso.pesoAlvo - metaPeso.pesoInicial;
    const progressoAtual = pesoAtual - metaPeso.pesoInicial;
    let porcentagem = variacaoPeso !== 0 ? Math.min(100, Math.max(0, (progressoAtual / variacaoPeso) * 100)) : 0;

    let mensagem = '';
    let classeStatus = '';

    if (variacaoPeso < 0) {
        if (pesoAtual <= metaPeso.pesoAlvo) {
            mensagem = '🎉 Meta alcançada! Parabéns!';
            classeStatus
 = 'sucesso';
        } else if (pesoAtual < metaPeso.pesoInicial) {
            mensagem = `✅ Você já perdeu ${(metaPeso.pesoInicial - pesoAtual).toFixed(1)} kg! Continue assim!`;
            classeStatus = 'progresso';
        } else if (pesoAtual > metaPeso.pesoInicial) {
            mensagem = `⚠️ Você subiu ${(pesoAtual - metaPeso.pesoInicial).toFixed(1)} kg. Vamos focar!`;
            classeStatus = 'alerta';
        } else {
            mensagem = '📈 Ainda no peso inicial. Bora começar!';
            classeStatus = 'progresso';
        }
    } else {
        if (pesoAtual >= metaPeso.pesoAlvo) {
            mensagem = '🎉 Meta alcançada! Parabéns!';
            classeStatus = 'sucesso';
        } else if (pesoAtual > metaPeso.pesoInicial) {
            mensagem = `✅ Você já ganhou ${(pesoAtual - metaPeso.pesoInicial).toFixed(1)} kg! Continue assim!`;
            classeStatus = 'progresso';
        } else if (pesoAtual < metaPeso.pesoInicial) {
            mensagem = `⚠️ Você perdeu ${(metaPeso.pesoInicial - pesoAtual).toFixed(1)} kg. Fique atento!`;
            classeStatus = 'alerta';
        } else {
            mensagem = '📉 Ainda no peso inicial. Bora começar!';
            classeStatus = 'progresso';
        }
    }

    container.innerHTML = `
        <div class="meta-info">
            <p><strong>Peso inicial:</strong> ${metaPeso.pesoInicial.toFixed(1)} kg</p>
            <p><strong>Peso alvo:</strong> ${metaPeso.pesoAlvo.toFixed(1)} kg</p>
            <p><strong>Prazo:</strong> ${metaPeso.prazoDias} dias</p>
            <p><strong>Peso atual:</strong> ${pesoAtual.toFixed(1)} kg</p>
        </div>
        <div class="barra-progresso-container">
            <div class="barra-progresso" style="width: ${porcentagem}%">
                ${porcentagem.toFixed(0)}%
            </div>
        </div>
        <p class="status-meta ${classeStatus}">${mensagem}</p>
    `;
}
