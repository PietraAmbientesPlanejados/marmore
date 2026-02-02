# 🏗️ SISTEMA DE ORÇAMENTO DE MÁRMORE - GUIA DE HOSPEDAGEM

## 📋 SOBRE O SISTEMA

Sistema completo de orçamento e plano de corte para mármore e granito com:
- ✅ Cadastro de materiais
- ✅ Gestão de orçamentos e ambientes
- ✅ Peças nomeadas com acabamentos
- ✅ Plano de corte automático
- ✅ Geração de etiquetas térmicas (PDF)
- ✅ Cálculo de margem de lucro
- ✅ Salvamento automático

---

## 🚀 OPÇÕES DE HOSPEDAGEM

### **Opção 1: Vercel (RECOMENDADO - GRÁTIS)**
✅ Mais fácil e rápido
✅ Deploy automático
✅ HTTPS grátis
✅ CDN global

### **Opção 2: Netlify (GRÁTIS)**
✅ Muito fácil
✅ Deploy por drag-and-drop
✅ HTTPS grátis

### **Opção 3: GitHub Pages (GRÁTIS)**
✅ Integrado com GitHub
✅ Simples
✅ Versionamento

### **Opção 4: Servidor Próprio**
✅ Controle total
✅ Sem dependências
💰 Pode ter custo

---

## 📦 MÉTODO 1: VERCEL (MAIS FÁCIL)

### **Passo 1: Preparar Arquivos**

1. Crie uma pasta no seu computador: `orcamento-marmore`

2. Dentro dela, crie os seguintes arquivos:

**Arquivo: `index.html`**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistema de Orçamento - Mármore</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="./app.jsx"></script>
</body>
</html>
```

**Arquivo: `app.jsx`**
```
(Cole todo o conteúdo do arquivo orcamento-marmore.jsx aqui)
```

**Arquivo: `vercel.json`**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### **Passo 2: Instalar Vercel CLI**

Abra o terminal/prompt de comando:

```bash
npm install -g vercel
```

### **Passo 3: Deploy**

No terminal, dentro da pasta `orcamento-marmore`:

```bash
vercel
```

Siga as instruções:
- Login com GitHub/Email
- Confirm deploy
- Pronto!

Você receberá uma URL tipo: `https://orcamento-marmore.vercel.app`

---

## 📦 MÉTODO 2: NETLIFY (DRAG-AND-DROP)

### **Passo 1: Preparar Arquivos**

Mesmos arquivos do Método 1 (index.html + app.jsx)

### **Passo 2: Fazer Upload**

1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta para a página
3. Pronto!

URL gerada: `https://seu-site.netlify.app`

---

## 📦 MÉTODO 3: GITHUB PAGES

### **Passo 1: Criar Repositório**

1. Crie conta no GitHub (se não tiver)
2. Crie novo repositório: `orcamento-marmore`
3. Marque como "Public"

### **Passo 2: Upload dos Arquivos**

1. Clique em "Upload files"
2. Arraste: `index.html` e `app.jsx`
3. Commit

### **Passo 3: Ativar GitHub Pages**

1. Settings → Pages
2. Source: "main branch"
3. Save

URL: `https://seu-usuario.github.io/orcamento-marmore`

---

## 📦 MÉTODO 4: SERVIDOR LOCAL (TESTE)

### **Para Testar Localmente:**

1. Instale Python (se não tiver)

2. No terminal, dentro da pasta:

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

3. Abra navegador: `http://localhost:8000`

---

## 🔧 MÉTODO 5: SERVIDOR PRÓPRIO (cPanel)

### **Se você tem hospedagem com cPanel:**

1. Acesse cPanel → Gerenciador de Arquivos
2. Vá para `public_html`
3. Crie pasta: `orcamento`
4. Upload dos arquivos: `index.html` e `app.jsx`
5. Acesse: `https://seusite.com/orcamento`

---

## ⚙️ CONFIGURAÇÕES IMPORTANTES

### **CORS (Cross-Origin)**

Se tiver problemas com jsPDF, adicione ao `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';">
```

### **Cache**

Para forçar atualização, adicione versão:

```html
<script type="text/babel" src="./app.jsx?v=1.0.0"></script>
```

Aumente a versão quando atualizar.

---

## 🎯 ESTRUTURA FINAL

```
orcamento-marmore/
├── index.html          (Arquivo HTML principal)
├── app.jsx             (Seu sistema React completo)
└── vercel.json         (Opcional - só para Vercel)
```

---

## ✅ CHECKLIST PÓS-DEPLOY

Após hospedar, teste:

- [ ] Sistema abre normalmente
- [ ] Consegue cadastrar materiais
- [ ] Consegue criar orçamentos
- [ ] Consegue adicionar peças
- [ ] Plano de corte funciona
- [ ] **Etiquetas PDF são geradas e baixadas** ✨
- [ ] Salvamento funciona
- [ ] Layout está correto
- [ ] Responsivo no celular

---

## 🐛 TROUBLESHOOTING

### **Problema: jsPDF não carrega**
**Solução:** Verifique se tem acesso à internet e CDN funciona

### **Problema: React não funciona**
**Solução:** Verifique se os scripts estão carregando

### **Problema: Página em branco**
**Solução:** Abra Console (F12) e veja erros

### **Problema: Dados não salvam**
**Solução:** LocalStorage está habilitado no navegador?

---

## 📱 ACESSO MÓVEL

Depois de hospedado, você pode:
- Acessar de qualquer dispositivo
- Criar atalho na tela inicial
- Usar offline (se configurar PWA)

---

## 🔐 SEGURANÇA

### **Recomendações:**

1. **Senha:** Adicione autenticação básica
2. **HTTPS:** Use sempre HTTPS (Vercel/Netlify já tem)
3. **Backup:** Exporte dados regularmente
4. **Atualização:** Mantenha versão atualizada

---

## 💡 PRÓXIMOS PASSOS

Depois de hospedar, você pode adicionar:

1. **Autenticação:** Login/senha
2. **Banco de Dados:** Firebase, Supabase
3. **Multi-usuário:** Compartilhar orçamentos
4. **API:** Integração com outros sistemas
5. **Relatórios:** Mais tipos de relatórios
6. **PWA:** App instalável
7. **Impressão:** Integração direta com impressora

---

## 📞 SUPORTE

Problemas ao hospedar?

1. Verifique Console do navegador (F12)
2. Veja logs do serviço (Vercel/Netlify)
3. Teste localmente primeiro
4. Verifique permissões de arquivos

---

## 🎉 PRONTO!

Após hospedar, você terá:
- ✅ Sistema acessível de qualquer lugar
- ✅ Etiquetas PDF funcionando 100%
- ✅ Sem limitações do artifact
- ✅ Controle total

**Escolha um método e hospede agora!** 🚀

---

## 📝 LICENÇA

Sistema criado para uso interno. Todos os direitos reservados.

---

**Versão:** 1.0.0  
**Data:** 02/02/2025  
**Desenvolvido com:** React + TailwindCSS + jsPDF
