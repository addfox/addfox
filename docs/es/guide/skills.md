---
name: addfox-skills
description: Documentación de Skills instalables de Addfox. Esta página está alineada con el contenido actual de c:/programs/skills, incluyendo comandos de instalación, lista de skills y estructura de directorios.
---

# Skills

El contenido de esta página se mantiene consistente con el repositorio actual de `c:/programs/skills`.

Este repositorio proporciona Skills de desarrollo de extensiones Addfox instalables.

## Agregar uso

Ejecutar en la raíz del proyecto:

```bash
# Instalar todos los skills de este repositorio
npx skills add addmo-dev/skills

# Solo instalar skills específicos
npx skills add addmo-dev/skills --skill migrate-to-addfox
npx skills add addmo-dev/skills --skill addfox-best-practices
npx skills add addmo-dev/skills --skill extension-functions-best-practices
npx skills add addmo-dev/skills --skill addfox-debugging
npx skills add addmo-dev/skills --skill addfox-testing

# Primero listar skills disponibles
npx skills add addmo-dev/skills --list
```

También puedes usar la URL completa de GitHub:

```bash
npx skills add https://github.com/addmo-dev/skills
```

## Lista de Skills

| Skill | Uso |
|-------|------|
| **migrate-to-addfox** | Migrar proyectos existentes desde WXT, Plasmo, Extension.js o soluciones sin framework a Addfox. |
| **addfox-best-practices** | Mejores prácticas para proyectos Addfox: entradas, configuración, manifest, permisos, navegadores cruzados, estilos de framework, comunicación de mensajes, etc. |
| **extension-functions-best-practices** | Guía de implementación de funciones de extensión: video/audio/imagen/descarga/AI/traducción/gestor de contraseñas/Web3 y otros escenarios de capacidades. |
| **addfox-debugging** | Resolución de problemas de construcción y ejecución de Addfox: combinando terminal, `.addfox/error.md`, `.addfox/meta.md` para ubicación. |
| **addfox-testing** | Prácticas de pruebas de Addfox: selección, configuración e implementación de pruebas unitarias y E2E. |

## Estructura del repositorio

```tree
skills/
├── migrate-to-addfox/
│   ├── SKILL.md
│   └── references/
├── addfox-best-practices/
│   ├── SKILL.md
│   ├── reference.md
│   └── rules/
├── extension-functions-best-practices/
│   ├── SKILL.md
│   └── reference.md
├── addfox-debugging/
│   ├── SKILL.md
│   └── reference.md
└── addfox-testing/
    ├── SKILL.md
    └── reference.md
```

## Notas

- Los Skills se instalan a través de `skills CLI`, luego se copian al directorio de skills del proyecto (como `.cursor/skills/` o `.agents/skills/`).
- Puedes instalar completamente primero, luego retener skills comunes según las necesidades del equipo.
