# SmartWrite Publisher

> **Módulo do SmartWrite Orchestrator** — Publicação direta de notas Obsidian no Substack e WordPress.

## Instalação

Este plugin é gerenciado pelo **SmartWrite Orchestrator**. Instale via a loja de módulos do Orchestrator — não instale manualmente.

## Funcionalidades (MVP)

- Publicar nota ativa no **Substack** (rascunho ou publicado)
- Publicar nota ativa no **WordPress** via Application Password
- Leitura de frontmatter como cockpit de publicação (`title`, `subtitle`, `tags`, `status`)
- Conversão Markdown → HTML fiel (preservando cabeçalhos, listas, código, negrito)

## Desenvolvimento

```bash
npm install
npm run dev      # modo watch
npm run build    # produção
npm run lint     # lint com plugin oficial obsidianmd
```

## Arquitetura

Este módulo implementa o contrato `smartwrite.module.json` e é instalado pelo Orchestrator em `.obsidian/plugins/smartwrite-publisher/`.

A autenticação é centralizada no Orchestrator (`AuthManager`) — o Publisher apenas consome as credenciais já configuradas.

## Referências

- [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [SmartWrite Orchestrator](https://github.com/zandercpzed/smartwrite-orchestrator)
