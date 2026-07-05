#!/usr/bin/env python3
"""
Comprehensive i18n replacement script.
Replaces hardcoded Chinese text in JSX with t('key') calls.
Handles: JSX text nodes, attribute values, template literals.
"""

import re
import json
import os

BASE = "/Users/daxixi/Library/Application Support/com.tencent.mac.marvis/MarvisData/User/oAN1i2VmsGbdO4eyNVh90OQ9zP5E/workspace/conv_19ed68a9a2d_8b165236c049/output/battery_swap_platform/cambodia-battery-investment/frontend"

def make_key(prefix, idx):
    return f"{prefix}.txt.{idx:03d}"

def extract_chinese(content):
    pattern = re.compile(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+')
    strings = set()
    for m in pattern.finditer(content):
        s = m.group().strip()
        if s and len(s) >= 1:
            strings.add(s)
    return sorted(strings, key=lambda x: -len(x))

def build_mapping(content, prefix):
    strings = extract_chinese(content)
    mapping = {}
    for i, s in enumerate(strings):
        mapping[s] = make_key(prefix, i)
    return mapping

def replace_chinese_in_jsx(content, mapping):
    """Replace Chinese text in JSX contexts with t('key') calls."""
    
    # Step 1: Replace JSX text nodes: >TEXT< where TEXT contains Chinese
    # Pattern: > (optional whitespace/non-Chinese) Chinese (optional non-Chinese) <
    # We need to match the innermost Chinese-containing text nodes
    def replace_text_node(m):
        full = m.group(0)
        prefix = m.group(1)   # '>'
        content_text = m.group(2)
        suffix = m.group(3)   # '<'
        
        # Check if this is inside a module-level constant (heuristic: look for surrounding context)
        # We'll skip if content_text is very short and common (like single chars)
        
        new_text = content_text
        # Sort by key length (longest first) to avoid partial matches
        sorted_keys = sorted(mapping.items(), key=lambda x: -len(x[0]))
        for cn, key in sorted_keys:
            if cn in new_text and len(cn) >= 2:  # Only replace strings of length >= 2
                # Check if this text is already inside a t() call
                # Simple heuristic: don't replace if it's inside t('...')
                new_text = new_text.replace(cn, f"{{t('{key}')}}")
                break  # Only replace the longest match once per text node
        
        return f"{prefix}{new_text}{suffix}"
    
    # Pattern for JSX text between tags
    # Match: > followed by content that doesn't start with { (not an expression) and ends before <
    text_node_pattern = re.compile(r'(>)(\s*)([^<{]*[\u4e00-\u9fff][^<{]*)(\s*)(<)')
    
    # Step 2: Replace attribute values: ="TEXT" or ='TEXT' where TEXT contains Chinese
    # But NOT in import/require/module-level contexts
    def replace_attr_value(m):
        full = m.group(0)
        attr_prefix = m.group(1)  # placeholder=" or title=" etc.
        quote = m.group(2)        # " or '
        value = m.group(3)        # the Chinese text
        
        sorted_keys = sorted(mapping.items(), key=lambda x: -len(x[0]))
        matched = False
        for cn, key in sorted_keys:
            if cn == value and len(cn) >= 2:
                # Replace the quoted attribute with JSX expression
                return f"{attr_prefix}{{{t('{key}')}}}"
        return full
    
    attr_pattern = re.compile(r'(\b\w+)=([\"\'])([^\"\']*[\u4e00-\u9fff][^\"\']*)\2')
    
    # Step 3: Replace Chinese in template literals with t() calls
    # This is the hardest part. We'll handle common patterns.
    
    result = content
    
    # First pass: attribute values
    result = attr_pattern.sub(replace_attr_value, result)
    
    # Second pass: text nodes
    # This is tricky with regex. Let's use a different approach.
    # We'll find all JSX text containing Chinese and replace each Chinese string
    
    # Simplified approach: For each Chinese string in mapping, do direct string replacement
    # but only within JSX context (between < and > tags, excluding module-level code)
    
    # Actually, this approach is too fragile. Let me try a different strategy.
    
    return result

# Let's take a more targeted approach
# For each file, we'll identify specific replacement points

def process_file(filepath, prefix, base_dir=BASE):
    full_path = os.path.join(base_dir, filepath)
    with open(full_path, 'r') as f:
        content = f.read()
    
    mapping = build_mapping(content, prefix)
    
    # Strategy: process line by line for JSX content
    lines = content.split('\n')
    in_module_constant = False
    new_lines = []
    replacements_made = 0
    
    for i, line in enumerate(lines):
        # Skip module-level constants (lines with const/let/var = [...] or = {...} before any function)
        # Also skip comment lines
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            new_lines.append(line)
            continue
        
        # Skip lines that are purely module-level constant definitions
        # These typically define arrays/objects at module scope
        if (re.match(r'^(const|let|var)\s+\w+\s*=\s*[\[{]', stripped) and 
            not ('function' in stripped or '=>' in stripped or 'return' in stripped or 'export' in stripped)):
            # Check if this is inside a function (indented) vs module level (no indent)
            if not line.startswith('  ') and not line.startswith('\t'):
                new_lines.append(line)
                continue
        
        modified = line
        
        # Replace Chinese in JSX text: >TEXT<
        # Pattern for text between > and < in JSX (not inside {})
        def replace_in_line(m):
            nonlocal replacements_made
            chinese = m.group(1)
            sorted_keys = sorted(mapping.items(), key=lambda x: -len(x[0]))
            for cn, key in sorted_keys:
                if cn == chinese and len(cn) >= 2:
                    replacements_made += 1
                    return f">{'{t(\"' + key + '\")}'}<"
                elif cn in chinese and len(cn) >= 3:
                    # Replace longest match first
                    new_cn = chinese.replace(cn, f"{{t('{key}')}}")
                    replacements_made += 1
                    return f">{new_cn}<"
            return m.group(0)
        
        # Match >TEXT< where TEXT doesn't contain < or {
        modified = re.sub(r'>([^<{]*[\u4e00-\u9fff][^<{]*)<', replace_in_line, modified)
        
        # Replace Chinese in JSX attribute values: ="TEXT"
        def replace_attr(m):
            nonlocal replacements_made
            attr = m.group(1)
            quote_char = m.group(2)
            value = m.group(3)
            sorted_keys = sorted(mapping.items(), key=lambda x: -len(x[0]))
            for cn, key in sorted_keys:
                if cn == value and len(cn) >= 2:
                    replacements_made += 1
                    return f'{attr}={{t(\"{key}\")}}'
                elif cn in value and len(cn) >= 3:
                    # For partial matches in attributes, use template literal
                    replaced = value.replace(cn, f"${{t('{key}')}}")
                    replacements_made += 1
                    return f'{attr}={{`{replaced}`}}'
            return m.group(0)
        
        modified = re.sub(r'(\b\w+)=["\']([^"\']*[\u4e00-\u9fff][^"\']*)["\']', replace_attr, modified)
        
        new_lines.append(modified)
    
    # Add import and useTranslation if replacements were made
    if replacements_made > 0:
        final = '\n'.join(new_lines)
        
        # Add import if not present
        if 'import { useTranslation }' not in final:
            # Find the last import line
            import_pattern = re.compile(r"^import\s+.*$", re.MULTILINE)
            imports = list(import_pattern.finditer(final))
            if imports:
                last_import_end = imports[-1].end()
                final = (final[:last_import_end] + 
                        "\nimport { useTranslation } from 'react-i18next';" + 
                        final[last_import_end:])
            elif "'use client'" in final or '"use client"' in final:
                idx = final.find(";\n", final.find("'use client'"))
                if idx == -1:
                    idx = final.find("\n\n", final.find("'use client'"))
                if idx != -1:
                    final = (final[:idx+1] + 
                            "\nimport { useTranslation } from 'react-i18next';" + 
                            final[idx+1:])
        
        # Add const { t } = useTranslation() inside the main component function
        # Find: export default function ComponentName() {
        func_match = re.search(r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)', final)
        if func_match:
            insert_pos = func_match.end()
            if 'const { t } = useTranslation()' not in final:
                final = (final[:insert_pos] + 
                        '\n  const { t } = useTranslation();' + 
                        final[insert_pos:])
        
        with open(full_path, 'w') as f:
            f.write(final)
        print(f"  {filepath}: {replacements_made} replacements, {len(mapping)} keys")
    else:
        print(f"  {filepath}: no changes needed")
    
    return mapping, replacements_made

# Process all files
all_mappings = {}
files_to_process = [
    ("src/app/page.js", "home"),
    ("src/app/invest/page.js", "invest"),
    ("src/app/admin/page.js", "admin"),
    ("src/app/franchisee/page.js", "franchisee"),
    ("src/app/login/page.js", "login"),
    ("src/app/register/page.js", "register"),
    ("src/app/trade/page.js", "trade"),
    ("src/app/stores/page.js", "stores"),
    ("src/app/profile/page.js", "profile"),
    ("src/app/admin/battery-types/page.js", "admin"),
    ("src/app/admin/operation-sites/page.js", "admin"),
    ("src/app/admin/workers/page.js", "admin"),
    ("src/components/Navbar.js", "nav"),
    ("src/app/layout.js", "common"),
]

print("Processing files...")
for filepath, prefix in files_to_process:
    mapping, count = process_file(filepath, prefix)
    if mapping:
        all_mappings[filepath] = mapping

print(f"\nTotal files processed: {len(all_mappings)}")
