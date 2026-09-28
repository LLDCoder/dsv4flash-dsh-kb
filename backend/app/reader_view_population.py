"""Compose existing view, object and scope names without discarding constraints."""
from itertools import product
from .reader_text import words


def _names(fact):
    return [words(n) for n in [fact.get('concept', ''), *fact.get('aliases', [])] if words(n)]


def _active_records(knowledge):
    # Conflicting versions are never resolved by traversal order.
    records, conflicts = {}, set()
    for item in knowledge.items.values():
        record = item.get('record') or {}
        if record.get('status') != 'active' or not record.get('id'):
            continue
        key = record['id']
        if key in records and records[key] != record:
            conflicts.add(key)
        records[key] = record
    records = {k: v for k, v in records.items() if k not in conflicts}
    return records


def documented_view_identity(knowledge, page, requested_view, entity):
    """Resolve a qualified view only from this page's active object/view facts."""
    records = _active_records(knowledge)
    candidates = []
    for record in records.values():
        payload = record.get('payload', {})
        if record.get('kind') != 'page_definition' or (payload.get('pageIdentity') or {}).get('route') != page:
            continue
        views = payload.get('routing', {}).get('views', [])
        for view in views:
            if not isinstance(view, dict) or not view.get('id'):
                continue
            if sum(isinstance(v, dict) and v.get('id') == view['id'] for v in views) != 1:
                continue
            names = [words(n) for n in [view['id'], view.get('label', ''), *view.get('aliases', [])]
                     if isinstance(n, str) and words(n) and not n.isdecimal()]
            for facts_record in records.values():
                facts = facts_record.get('payload', {})
                if (facts_record.get('kind') != 'field_semantics' or facts.get('pageRef') != page
                        or facts.get('view') != view['id']):
                    continue
                for fact in facts.get('bindings', []):
                    if (fact.get('kind') != 'object' or fact.get('conditions') or not fact.get('id')
                            or not all(fact.get(k) for k in ('operationRef', 'sourcePath', 'fields'))
                            or not words(entity) or words(entity) not in _names(fact)):
                        continue
                    modifiers = [set()] + [n - words(entity) for n in _names(fact) if words(entity) < n]
                    if any(words(requested_view) == name | modifier for name, modifier in product(names, modifiers)):
                        candidates.append({'id': view['id'], 'viewEvidence': {'recordId': record['id'],
                            'revision': record['revision'], 'pageRef': page},
                            'objectEvidenceBindingId': facts_record['id'] + '#' + fact['id']})
    meanings = {c['id'] for c in candidates}
    return candidates[0] if len(meanings) == 1 else None


def bind_view_population_compositions(entries, knowledge, context):
    """Add lexical evidence only; ordinary view/context/collection guards still apply.

    A page may define a population as ``queued`` and call its view both ``Queued``
    and ``Queued list``. Such documented wrappers can accompany another alias of
    that SAME view. No general stopword rule removes ``list``, ownership or a
    business qualifier. Object modifiers must complete an existing object alias.
    """
    requirements = context.get('requirements', [])
    scope = next((r['value'] for r in requirements if r['kind'] == 'scope'), None)
    entity = next((r['value'] for r in requirements if r['kind'] == 'object'), None)
    view = next((r['value'] for r in requirements if r['kind'] == 'view'), None)
    if not scope or not entity or not view:
        return
    records = _active_records(knowledge)
    candidates = []
    for population in entries:
        if population['kind'] != 'population' or population.get('conditions'):
            continue
        payload = records.get(population['recordId'], {}).get('payload', {})
        page = payload.get('pageRef')
        identity = documented_view_identity(knowledge, page, view, entity) if page else None
        canonical_view = identity['id'] if identity else view
        if not page or payload.get('view') != canonical_view or not isinstance(population.get('contextParameters'), dict):
            continue
        def same_mapping(fact):
            return (fact['recordId'] == population['recordId']
                and fact['operationRef'] == population['operationRef']
                and fact['sourcePath'] == population['sourcePath']
                and set(fact['fields']) == set(population['fields']) and not fact.get('conditions'))
        scopes = [f for f in entries if f['kind'] == 'scope' and same_mapping(f)
            and words(scope) in _names(f)
            and f.get('contextParameters') == population['contextParameters']
            and f.get('contextBindings', {}) == population.get('contextBindings', {})]
        objects = [f for f in entries if f['kind'] == 'object' and same_mapping(f)
            and words(entity) in _names(f)
            and (f.get('contextParameters') is None
                 or f.get('contextParameters') == population['contextParameters'])]
        for record in records.values():
            route = record.get('payload', {})
            if record.get('kind') != 'page_definition' or (route.get('pageIdentity') or {}).get('route') != page:
                continue
            definitions = [d for d in route.get('routing', {}).get('views', [])
                           if isinstance(d, dict) and d.get('id') == canonical_view]
            if len(definitions) != 1:
                continue
            definition = definitions[0]
            view_names = [words(n) for n in [canonical_view, definition.get('label', ''), *definition.get('aliases', [])]
                          if isinstance(n, str) and words(n) and not n.isdecimal()]
            population_names = _names(population)
            # The view has to explicitly name this population, not just share a route.
            bases = [n for n in view_names if n in population_names]
            if not bases:
                continue
            wrappers = [set()] + [n - p for n in view_names for p in population_names if p < n]
            for own, obj in product(scopes, objects):
                modifiers = [set()] + [n - words(entity) for n in _names(obj) if words(entity) < n]
                for requirement in requirements:
                    if requirement['kind'] != 'population':
                        continue
                    requested = words(requirement['value']) - {'in', 'the', 'from'}
                    for base, wrapper, owner, modifier in product(bases, wrappers, [set(), *_names(own)], modifiers):
                        if requested != base | wrapper | owner | modifier:
                            continue
                        candidates.append((population, requirement, {
                            'requirementId': requirement['id'], 'value': requirement['value'],
                            'resolvedAlias': population['concept'],
                            'evidenceBindingIds': [population['knowledgeBindingId'], own['knowledgeBindingId'], obj['knowledgeBindingId']],
                            'viewEvidence': {'recordId': record['id'], 'revision': record['revision'], 'view': canonical_view, 'pageRef': page},
                            'reason': 'same_page_view_population_object_and_retained_scope_composition'}))
                        break
    for population, requirement, proof in candidates:
        meanings = {frozenset(words(p['concept'])) for p, r, _ in candidates if r['id'] == requirement['id']}
        if len(meanings) == 1:
            population.setdefault('intentAliases', []).append(proof)
