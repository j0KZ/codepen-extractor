# 📚 Documentación del Proyecto CodePen Extractor

> Sistema web para extraer, almacenar y transformar animaciones de CodePen con IA

## 📋 Índice de Documentos

### Documentación Esencial (Implementación)

| Documento | Descripción |
|-----------|-------------|
| **[IMPLEMENTATION-SPEC.md](./IMPLEMENTATION-SPEC.md)** | ⭐ **FUENTE DE VERDAD** - Especificación completa para implementar sin preguntas |
| **[SPEC-Context.md](./SPEC-Context.md)** | Especificación del ClaudeContext |
| **[SPEC-TransformPolling.md](./SPEC-TransformPolling.md)** | Especificación del hook de polling |
| **[SPEC-Variations.md](./SPEC-Variations.md)** | Especificación del servicio de variaciones |
| **[SPEC-SharedTypes.md](./SPEC-SharedTypes.md)** | Especificación de tipos compartidos |
| **[SPEC-CodeEditor.md](./SPEC-CodeEditor.md)** | Especificación del componente CodeEditor |
| **[AUDIT_COMPLEMENT.md](./AUDIT_COMPLEMENT.md)** | Auditoría y complementos adicionales |

### Documentación de Contexto

| Documento | Descripción |
|-----------|-------------|
| **[PRD.md](./PRD.md)** | Documento de Requisitos del Producto - Visión, funcionalidades y métricas |
| **[Architecture.md](./Architecture.md)** | Arquitectura técnica del sistema - Componentes, diagramas y flujo de datos |
| **[Rules.md](./Rules.md)** | Reglas y convenciones - Estándares de código, Git, seguridad y testing |
| **[Plan.md](./Plan.md)** | Plan de implementación - Fases, timeline y criterios de éxito |
| **[Scaffold.md](./Scaffold.md)** | Estructura de archivos - Templates y configuración del proyecto |
| **[Investigación_Profunda_de_CodePen_y_IA.md](./Investigación_Profunda_de_CodePen_y_IA.md)** | Investigación técnica forense sobre CodePen y MCP |

---

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Claude Code Desktop
- Puppeteer

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/codepen-extractor.git
cd codepen-extractor

# Instalar dependencias
npm install

# Desarrollo
npm run dev
```

---

## 📖 Flujo de Lectura Recomendado

### Para Implementar (Developer)
1. **Empezar aquí**: Este README
2. **⭐ Ir directo a**: [IMPLEMENTATION-SPEC.md](./IMPLEMENTATION-SPEC.md) - Todo lo que necesitas para codificar
3. **Seguir las reglas**: [Rules.md](./Rules.md) - Estándares del proyecto
4. **Ver el plan**: [Plan.md](./Plan.md) - Fases y timeline

### Para Entender el Contexto (Stakeholder)
1. **Qué**: [PRD.md](./PRD.md) - Requisitos del producto
2. **Cómo**: [Architecture.md](./Architecture.md) - Arquitectura del sistema
3. **Por qué**: [Investigación_Profunda_de_CodePen_y_IA.md](./Investigación_Profunda_de_CodePen_y_IA.md) - Investigación técnica

---

## 📊 Estado del Proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 0 | 🔄 Preparación | Configuración inicial y pruebas de viabilidad |
| Fase 1 | ⏳ MVP | Extracción básica de Pens |
| Fase 2 | ⏳ Galería | Galería y previsualización |
| Fase 3 | ⏳ IA | Integración con Claude Code |
| Fase 4 | ⏳ Avanzado | Exportación y testing |

---

## 🔗 Recursos Externos

- [CodePen Documentation](https://blog.codepen.io/documentation/)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Puppeteer](https://pptr.dev/)

---

## 📝 Licencia

MIT License - Ver archivos individuales para atribución.
