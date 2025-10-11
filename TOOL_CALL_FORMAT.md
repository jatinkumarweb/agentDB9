# Tool Call Format

## Overview

The system uses **JSON format** for tool calls instead of XML. This provides better reliability because:

1. **Native LLM format** - LLMs are trained on JSON and generate it more accurately
2. **jsonrepair integration** - Automatically fixes common JSON errors (missing quotes, braces, etc.)
3. **Simpler parsing** - No XML tag matching issues
4. **More concise** - Less verbose than XML

## Format

### Standard Format

```
TOOL_CALL:
{
  "tool": "tool_name",
  "arguments": {
    "arg1": "value1",
    "arg2": "value2"
  }
}
```

### Examples

**List files:**
```
TOOL_CALL:
{
  "tool": "list_files",
  "arguments": {
    "path": "."
  }
}
```

**Write file:**
```
TOOL_CALL:
{
  "tool": "write_file",
  "arguments": {
    "path": "src/App.js",
    "content": "import React from 'react';\n\nexport default function App() {\n  return <div>Hello World</div>;\n}"
  }
}
```

**Create directory:**
```
TOOL_CALL:
{
  "tool": "create_directory",
  "arguments": {
    "path": "src/components"
  }
}
```

**Execute command:**
```
TOOL_CALL:
{
  "tool": "execute_command",
  "arguments": {
    "command": "npm install react"
  }
}
```

## Available Tools

- `get_workspace_summary` - Get comprehensive workspace analysis
- `list_files` - List files and directories
- `read_file` - Read file contents
- `write_file` - Write or update a file
- `create_directory` - Create a directory
- `delete_file` - Delete a file
- `execute_command` - Run shell commands
- `git_status` - Get git repository status
- `git_commit` - Commit changes to git

## Parsing Logic

The parser uses multiple strategies:

1. **Primary**: Look for `TOOL_CALL:` marker followed by JSON
2. **Fallback**: Look for JSON object with `"tool"` and `"arguments"` keys
3. **Legacy**: Support old XML format for backward compatibility
4. **Error recovery**: Use `jsonrepair` to fix malformed JSON

### Error Handling

Common JSON errors are automatically fixed by jsonrepair:

- Missing closing quotes: `{"path": "app.js}` → `{"path": "app.js"}`
- Missing closing braces: `{"tool": "write_file", "arguments": {"path": "app.js"` → Fixed
- Trailing commas: `{"path": ".",}` → `{"path": "."}`
- Single quotes: `{'tool': 'write_file'}` → `{"tool": "write_file"}`

## Migration from XML

The system still supports the old XML format for backward compatibility:

```xml
<tool_call>
  <tool_name>write_file</tool_name>
  <arguments>{"path": "app.js", "content": "..."}</arguments>
</tool_call>
```

However, **JSON format is strongly preferred** and will be used by default going forward.

## Benefits Over XML

| Aspect | XML | JSON |
|--------|-----|------|
| LLM accuracy | ❌ Prone to tag errors | ✅ Native format |
| Error recovery | ❌ Hard to fix | ✅ jsonrepair fixes automatically |
| Parsing complexity | ❌ Multiple regex patterns | ✅ Simple JSON.parse |
| Verbosity | ❌ More verbose | ✅ More concise |
| Type safety | ❌ Strings only | ✅ Native types |

## System Prompt

The system prompt instructs the LLM to use JSON format:

```
EXACT TOOL FORMAT (COPY EXACTLY):
TOOL_CALL:
{
  "tool": "tool_name",
  "arguments": {
    "arg": "value"
  }
}

CRITICAL JSON RULES:
- Start with TOOL_CALL: marker on its own line
- Use "tool" key for the tool name (string)
- Use "arguments" key for the parameters (object)
- ALL string values MUST have closing quotes
- ALL objects MUST have closing braces
- Use double quotes for keys and values (NOT single quotes)
- No trailing commas
```

## Testing

To test the parser, you can use the test script:

```bash
node /tmp/test_json_parse.js
```

This tests various scenarios including:
- Perfect JSON
- JSON without marker
- Malformed JSON (jsonrepair fixes)
- JSON with surrounding text
