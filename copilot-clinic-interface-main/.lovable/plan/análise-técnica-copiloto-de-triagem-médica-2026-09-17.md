# Análise Técnica — Copiloto de Triagem Médica

Entrega: um documento em arquivo (PDF, com diagramas de fluxo em texto) salvo nos seus Arquivos, cobrindo arquitetura, fluxos, ciclo de vida das entregas e lacunas. Nenhuma alteração no protótipo nesta etapa.

Base usada: o formulário de projeto enviado (escopo, entregas, riscos, MVP, custos, cronograma 15/09 a 15/12/2026) e o protótipo de interface já construído (Início, Pacientes, Triagens, Agenda, Dossiês, Relatórios, Configurações — hoje com dados fictícios, sem banco, sem login e sem IA).

## Conteúdo do documento

### 1. Arquitetura e stack

- Visão em camadas: app do paciente (link web mobile) → API → motor de IA → banco → painel do médico.
- Stack do escopo (Python, LLM OpenAI/Anthropic, React/Next.js, PostgreSQL) e comparação honesta com o que o protótipo já usa hoje (React + TanStack Start), com recomendação de caminho: manter um back-end Python separado ou consolidar tudo na stack atual.
- Identidade visual: tipografia Onest, azul #246AFE, fundo #EBF0FE, branco e preto — como isso vira um conjunto de tokens reutilizado nas duas frentes (paciente e médico).
- Comunicação: contratos de API, autenticação por token, fila para o processamento de IA, tempo de resposta esperado e tratamento de falha do provedor de LLM.

### 2. Mapeamento dos fluxos

Três diagramas em texto, passo a passo, da entrada à saída:

- **Paciente:** agendamento → envio do link por WhatsApp → chat conversacional de sintomas no celular → confirmação de envio → lembretes de quem não preencheu.
- **IA (NLP):** relato bruto → sanitização → prompt estruturado → saída em JSON validada por esquema → tópicos médicos, sinais de alerta e hipóteses probabilísticas → persistência com registro de versão do modelo.
- **Médico:** login → painel do dia → abertura do dossiê em um clique → revisão, edição e aprovação → dossiê aprovado versionado e exportável.

### 3. Ciclo de vida das 3 entregas principais

Para link do paciente, motor de IA e painel do médico: começo (gatilhos e dados de entrada), meio (processamento em segundo plano) e fim (o que aparece na tela e o que é gravado no banco), com o modelo de dados correspondente (clínicas, usuários, pacientes, agendamentos, triagens, mensagens, dossiês, auditoria).

### 4. Lacunas e itens não implementados

Lista crítica e priorizada, incluindo:

- Autenticação e papéis (médico, recepção, admin da clínica), recuperação de senha, sessão e multi-clínica (isolamento de dados por clínica).
- Onboarding e gestão de clínicas, planos, limites de uso e cobrança.
- Link do paciente: expiração, reenvio, retomada no meio do preenchimento, preenchimento na recepção em totem/tablet, acessibilidade e idoso com baixa familiaridade digital.
- Risco documentado do paciente que não preenche: lembretes automáticos, formulário curto de fallback e captura assistida pela recepção.
- Fluxos de erro: falha ou lentidão da IA, relato vazio ou incompreensível, WhatsApp não entregue, paciente duplicado, consulta cancelada.
- Segurança e conformidade LGPD: consentimento explícito, base legal para dado de saúde, criptografia, retenção, trilha de auditoria, exportação e exclusão de dados, controle de acesso por registro.
- Qualidade clínica: aviso de que o pré-diagnóstico não substitui o médico, revisão obrigatória, detecção de urgência/emergência e encaminhamento imediato.
- Produto: notificações, busca global funcional, exportação do dossiê (PDF/impressão), histórico do paciente entre consultas, relatórios com dados reais, métricas de tempo economizado para provar a meta de 30%.
- Fora do MVP, registrado como dívida: integração com ERP das clínicas e prescrição automatizada.
- Telas secundárias ausentes hoje: login, esqueci minha senha, cadastro da clínica, convite de equipe, chat do paciente, página de erro/link expirado, estado vazio de cada listagem, confirmação de aprovação do dossiê.

### 5. Recomendação de sequência

Ordem sugerida de implementação em ondas, alinhada ao cronograma do formulário, indicando o que é bloqueante para o teste na clínica piloto.

## Observações técnicas

- O documento é gerado como PDF com a paleta do projeto (azul #246AFE, fundo claro #EBF0FE) e revisado página a página antes da entrega.
- A referência de design em PDF não chegou; a parte visual se apoia no protótipo atual e nas cores/tipografia que você informou. Se enviar o arquivo depois, atualizo a seção de identidade visual.
- Nenhum arquivo do aplicativo é alterado nesta etapa.
