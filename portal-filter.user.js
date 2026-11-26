// ==UserScript==
// @author         Takurua(@yuehuTi)
// @name           IITC plugin: Portal filter
// @category       Portal
// @version        0.1.1
// @description    Show only portals that match an expression, using data already on the map.
// @id             portal-filter
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://github.com/yuehuTi/iitc-ce-portal-filter/raw/refs/heads/main/portal-filter.meta.js
// @downloadURL    https://github.com/yuehuTi/iitc-ce-portal-filter/raw/refs/heads/main/portal-filter.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function () {};

  // @author         Takurua(@yuehuTi)
  // @name           Portal filter
  // @category       Portal
  // @version        0.1.1
  // @description    Show only portals that match an expression, using data already on the map.

  /* exported setup, changelog --eslint */
  /* global IITC -- eslint */

  var changelog = [
    {
      version: '0.1.1',
      changes: ['Filter by visited, captured and scout, loading portal history when the expression needs it'],
    },
    {
      version: '0.1.0',
      changes: ['Filter the map from the toolbox with a Portals list expression that does not read portal details'],
    },
  ];

  window.plugin.portalfilter = function () {};

  var FILTER_NAME = 'portal-filter';
  var STORAGE_KEY = 'plugin-portal-filter-query';

  var USE_ZH = (navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || ''])
    .some(function (lang) { return /^zh\b/i.test(lang || ''); });

  var I18N_EN = {
    title: 'Portal filter',
    queryPlaceholder: 'level >= 6 AND team = ENL',
    queryFilter: 'Filter',
    queryReset: 'Reset',
    help: 'Help',
    queryTip: 'Show only portals that match. Reset, or an empty expression, shows every portal again. An invalid expression turns red and leaves the map unchanged.',
    queryInvalid: 'Invalid expression',
    queryIncomplete: 'Incomplete expression',
    queryParen: 'Missing closing parenthesis',
    queryValue: 'Missing value',
    queryTail: 'Unexpected text after the expression',
    queryTeam: 'Unknown faction',
    queryOp: 'Operator not valid here',
    queryUnsupported: 'mods, resonators, owner and shields cannot be used here',
    loadingHistory: 'Loading visit history, {n} left',
  };
  var I18N_ZH = {
    title: 'Portal 过滤',
    queryPlaceholder: 'level >= 6 AND team = ENL',
    queryFilter: '过滤',
    queryReset: '重置',
    help: '帮助',
    queryTip: '只显示符合表达式的 Portal。点重置，或表达式为空，即显示全部。表达式无效时输入标红，当前地图不变。',
    queryInvalid: '表达式无效',
    queryIncomplete: '表达式不完整',
    queryParen: '缺少右括号',
    queryValue: '缺少比较值',
    queryTail: '表达式末尾有多余内容',
    queryTeam: '无法识别的阵营',
    queryOp: '这里不能使用这个运算符',
    queryUnsupported: '插件、共振器、主人和盾这里不能用',
    loadingHistory: '正在读取到访记录，还剩 {n}',
  };

  function t(key, vars) {
    var text = (USE_ZH && I18N_ZH[key] != null) ? I18N_ZH[key] : I18N_EN[key];
    if (text == null) return key;
    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, function (_, name) {
      return vars[name] == null ? '' : vars[name];
    });
  }

  function helpBodyHtml() {
    if (USE_ZH) {
      return [
        '<p>过滤框在右侧 Toolbox 上方。点过滤或按回车后，地图只留下符合表达式的 Portal。点重置，或表达式为空，即恢复全部。表达式写错时输入标红，当前地图不变。</p>',
        '<h3>运算符</h3>',
        '<ul>',
        '<li><code>AND</code>、<code>且</code>：两个条件都成立。紧挨着写的条件也是 AND，例如 <code>level &gt;= 6 team = ENL</code>。</li>',
        '<li><code>OR</code>、<code>或</code>：任一条件成立。<code>AND</code> 比 <code>OR</code> 更紧，需要先算的一组用括号。</li>',
        '<li><code>NOT</code>、<code>非</code>，或在条件前加 <code>-</code>：否定。</li>',
        '<li><code>=</code> 相等，<code>!=</code> 不相等。文字不区分大小写。</li>',
        '<li><code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code> 只用于数值。</li>',
        '<li><code>~</code> 包含，用于名字。</li>',
        '<li><code>:</code> 是简写。文字表示包含（<code>name:park</code>），数值表示相等（<code>level:6</code>），也可以带比较符（<code>level:&gt;=6</code>）。</li>',
        '<li><code>6..8</code> 是闭区间。<code>level:6..8</code> 等于 <code>level &gt;= 6 AND level &lt;= 8</code>。</li>',
        '</ul>',
        '<p>没写字段的词按名字包含来匹配。名字里有空格时加引号：<code>name ~ "central park"</code>。<code>me</code> 表示当前玩家的名字。</p>',
        '<h3>字段</h3>',
        '<ul>',
        '<li>名字：<code>name</code> <code>title</code> <code>portal</code> <code>名字</code> <code>名称</code></li>',
        '<li>等级：<code>level</code> <code>lvl</code> <code>lv</code> <code>等级</code></li>',
        '<li>阵营：<code>team</code> <code>faction</code> <code>阵营</code></li>',
        '<li>血量：<code>health</code> <code>hp</code> <code>血量</code></li>',
        '<li>共振器数量：<code>res</code> <code>rescount</code></li>',
        '<li>链接数：<code>links</code> <code>link</code> <code>链接</code></li>',
        '<li>区域数：<code>fields</code> <code>field</code> <code>区域</code></li>',
        '<li>敌方 AP：<code>ap</code></li>',
        '</ul>',
        '<h3>标志</h3>',
        '<p>单独写表示成立，也可以写成 <code>visited = true</code> 或 <code>visited = false</code>。真：<code>true</code> <code>yes</code> <code>1</code> <code>是</code>。假：<code>false</code> <code>no</code> <code>0</code> <code>否</code>。</p>',
        '<ul>',
        '<li><code>visited</code> / <code>visit</code> / <code>到访</code>：到访过，包括已占领。</li>',
        '<li><code>captured</code> / <code>cap</code> / <code>占领</code>：已占领。</li>',
        '<li><code>scout</code> / <code>侦察</code>：已侦察控制。</li>',
        '</ul>',
        '<p>到访、占领和侦察会读取 Portal 详情。详情还没到时，这些条件先不匹配，读到后再筛。<code>NOT visited</code> 在记录未知时也不会把该 Portal 放进来。</p>',
        '<h3>阵营</h3>',
        '<ul>',
        '<li>启蒙：<code>ENL</code> <code>E</code> <code>enlightened</code> <code>green</code> <code>绿</code> <code>启蒙</code></li>',
        '<li>抵抗：<code>RES</code> <code>R</code> <code>resistance</code> <code>blue</code> <code>蓝</code> <code>抵抗</code></li>',
        '<li>中立：<code>NEU</code> <code>N</code> <code>neutral</code> <code>none</code> <code>白</code> <code>中立</code> <code>灰</code></li>',
        '<li>Machina：<code>MAC</code> <code>machina</code> <code>红</code></li>',
        '<li>我方：<code>friendly</code> <code>友方</code> <code>我方</code></li>',
        '<li>敌方：<code>enemy</code> <code>敌方</code>。有阵营，并且不是自己的阵营。</li>',
        '</ul>',
        '<p>插件、共振器、主人和盾这里不能用。</p>',
      ].join('');
    }
    return [
      '<p>The box above the toolbox filters the map. Filter, or press Enter, leaves only the portals that match. Reset, or an empty expression, shows every portal again. An invalid expression turns red and leaves the map unchanged.</p>',
      '<h3>Operators</h3>',
      '<ul>',
      '<li><code>AND</code>: both sides match. Adjacent terms are also AND, for example <code>level &gt;= 6 team = ENL</code>.</li>',
      '<li><code>OR</code>: either side matches. <code>AND</code> binds tighter than <code>OR</code>. Use parentheses to group.</li>',
      '<li><code>NOT</code>, or <code>-</code> before a term: negation.</li>',
      '<li><code>=</code> equals, <code>!=</code> does not equal. Text is case-insensitive.</li>',
      '<li><code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code> apply to numbers.</li>',
      '<li><code>~</code> contains. Use it for the name.</li>',
      '<li><code>:</code> is shorthand. For text it means contains (<code>name:park</code>). For numbers it means equals (<code>level:6</code>), and it can carry a comparison (<code>level:&gt;=6</code>).</li>',
      '<li><code>6..8</code> is an inclusive range. <code>level:6..8</code> means <code>level &gt;= 6 AND level &lt;= 8</code>.</li>',
      '</ul>',
      '<p>A bare word matches a name that contains it. Quote a name that has spaces: <code>name ~ "central park"</code>. <code>me</code> is the current player name.</p>',
      '<h3>Fields</h3>',
      '<ul>',
      '<li>Name: <code>name</code> <code>title</code> <code>portal</code></li>',
      '<li>Level: <code>level</code> <code>lvl</code> <code>lv</code></li>',
      '<li>Faction: <code>team</code> <code>faction</code></li>',
      '<li>Health: <code>health</code> <code>hp</code></li>',
      '<li>Resonator count: <code>res</code> <code>rescount</code></li>',
      '<li>Link count: <code>links</code> <code>link</code></li>',
      '<li>Field count: <code>fields</code> <code>field</code></li>',
      '<li>Enemy AP: <code>ap</code></li>',
      '</ul>',
      '<h3>Flags</h3>',
      '<p>A bare flag means true. <code>visited = true</code> and <code>visited = false</code> also work. True: <code>true</code> <code>yes</code> <code>1</code>. False: <code>false</code> <code>no</code> <code>0</code>.</p>',
      '<ul>',
      '<li><code>visited</code> / <code>visit</code>: visited, including captured.</li>',
      '<li><code>captured</code> / <code>cap</code>: captured.</li>',
      '<li><code>scout</code>: scout controlled.</li>',
      '</ul>',
      '<p>Visited, captured, and scout load portal details. Until those details arrive, such a condition does not match; the map is filtered again when they do. <code>NOT visited</code> does not include a portal whose history is still unknown.</p>',
      '<h3>Factions</h3>',
      '<ul>',
      '<li>Enlightened: <code>ENL</code> <code>E</code> <code>enlightened</code> <code>green</code></li>',
      '<li>Resistance: <code>RES</code> <code>R</code> <code>resistance</code> <code>blue</code></li>',
      '<li>Neutral: <code>NEU</code> <code>N</code> <code>neutral</code> <code>none</code></li>',
      '<li>Machina: <code>MAC</code> <code>machina</code></li>',
      '<li>Your faction: <code>friendly</code></li>',
      '<li>The other faction: <code>enemy</code>. A faction portal that is not yours.</li>',
      '</ul>',
      '<p>Mods, resonators, owner, and shields cannot be used here.</p>',
    ].join('');
  }

  function queryError(key) {
    var err = new Error(t(key));
    err.query = true;
    return err;
  }

  var QUERY_FIELDS = {
    name: 'name', title: 'name', portal: 'name', '名字': 'name', '名称': 'name',
    level: 'level', lvl: 'level', lv: 'level', '等级': 'level',
    team: 'team', faction: 'team', '阵营': 'team',
    health: 'health', hp: 'health', '血量': 'health',
    res: 'res', rescount: 'res',
    links: 'links', link: 'links', '链接': 'links',
    fields: 'fields', field: 'fields', '区域': 'fields',
    ap: 'ap',
    shields: 'shields', shield: 'shields', '盾': 'shields',
    mods: 'mods', mod: 'mods',
    owner: 'owner', '主人': 'owner',
    resonator: 'resonator', resonators: 'resonator',
    'resonator.owner': 'resonatorOwner',
    visited: 'visited', visit: 'visited', '到访': 'visited',
    captured: 'captured', cap: 'captured', '占领': 'captured',
    scout: 'scout', '侦察': 'scout',
  };

  var UNSUPPORTED_FIELDS = {
    shields: 1, mods: 1, owner: 1, resonator: 1, resonatorOwner: 1,
  };

  function canonicalQueryField(raw) {
    return QUERY_FIELDS[String(raw).trim().toLowerCase()] || null;
  }

  function isQueryFlag(field) {
    return field === 'visited' || field === 'captured' || field === 'scout';
  }

  function isQueryBreak(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' ||
      ch === '(' || ch === ')' || ch === '=' || ch === '>' || ch === '<' ||
      ch === '~' || ch === ':' || ch === '"' || ch === '\'';
  }

  function tokenizeQuery(input) {
    var tokens = [];
    var i = 0;
    while (i < input.length) {
      var ch = input.charAt(i);
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        i++;
        continue;
      }
      if (ch === '(' || ch === ')') {
        tokens.push({ type: ch });
        i++;
        continue;
      }
      if (ch === '"' || ch === '\'') {
        var quote = ch;
        i++;
        var text = '';
        while (i < input.length && input.charAt(i) !== quote) {
          if (input.charAt(i) === '\\' && i + 1 < input.length) {
            text += input.charAt(i + 1);
            i += 2;
            continue;
          }
          text += input.charAt(i);
          i++;
        }
        if (i >= input.length) throw queryError('queryValue');
        i++;
        tokens.push({ type: 'value', value: text, quoted: true });
        continue;
      }
      if (input.substr(i, 2) === '>=' || input.substr(i, 2) === '<=' || input.substr(i, 2) === '!=') {
        tokens.push({ type: 'op', value: input.substr(i, 2) });
        i += 2;
        continue;
      }
      if (ch === '=' || ch === '>' || ch === '<' || ch === '~' || ch === ':') {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }
      if (ch === '-' && (i + 1 >= input.length || /[\s(A-Za-z_\u4e00-\u9fff]/.test(input.charAt(i + 1)))) {
        tokens.push({ type: 'not' });
        i++;
        continue;
      }
      var start = i;
      while (i < input.length && !isQueryBreak(input.charAt(i))) i++;
      if (start === i) throw queryError('queryIncomplete');
      tokens.push({ type: 'word', value: input.slice(start, i) });
    }
    return tokens;
  }

  function keywordKind(token) {
    if (!token) return '';
    if (token.type === 'not') return 'not';
    if (token.type !== 'word') return '';
    var word = token.value.toUpperCase();
    if (word === 'OR' || token.value === '或') return 'or';
    if (word === 'AND' || token.value === '且') return 'and';
    if (word === 'NOT' || token.value === '非') return 'not';
    return '';
  }

  function compilePortalQuery(source) {
    var tokens = tokenizeQuery(source);
    var pos = 0;

    function peek() { return tokens[pos]; }
    function take() { return tokens[pos++]; }

    function startsTerm(token) {
      if (!token || token.type === ')') return false;
      if (keywordKind(token) === 'or' || keywordKind(token) === 'and') return false;
      return token.type === '(' || token.type === 'word' || token.type === 'value' || keywordKind(token) === 'not';
    }

    function parseOr() {
      var left = parseAnd();
      while (keywordKind(peek()) === 'or') {
        take();
        left = { type: 'or', left: left, right: parseAnd() };
      }
      return left;
    }

    function parseAnd() {
      var left = parseNot();
      while (peek()) {
        if (keywordKind(peek()) === 'or' || peek().type === ')') break;
        if (keywordKind(peek()) === 'and') {
          take();
          left = { type: 'and', left: left, right: parseNot() };
          continue;
        }
        if (!startsTerm(peek())) break;
        left = { type: 'and', left: left, right: parseNot() };
      }
      return left;
    }

    function parseNot() {
      if (keywordKind(peek()) === 'not') {
        take();
        return { type: 'not', arg: parseNot() };
      }
      if (peek() && peek().type === '(') {
        take();
        var inner = parseOr();
        if (!peek() || peek().type !== ')') throw queryError('queryParen');
        take();
        return inner;
      }
      return parsePredicate();
    }

    function parsePredicate() {
      var token = peek();
      if (!token || (token.type !== 'word' && token.type !== 'value')) throw queryError('queryIncomplete');
      if (keywordKind(token) === 'and' || keywordKind(token) === 'or') throw queryError('queryIncomplete');
      if (token.type === 'value') {
        take();
        return { type: 'name', op: '~', value: token.value };
      }
      var field = canonicalQueryField(token.value);
      var ahead = tokens[pos + 1];
      var aheadIsOp = ahead && (ahead.type === 'op' || (ahead.type === 'word' && ahead.value.toUpperCase() === 'HAS'));
      if (field && UNSUPPORTED_FIELDS[field] && (aheadIsOp || isQueryFlag(field))) {
        throw queryError('queryUnsupported');
      }
      if (field && aheadIsOp) {
        take();
        return parseComparison(field);
      }
      if (field && isQueryFlag(field)) {
        take();
        return { type: 'flag', field: field };
      }
      take();
      return { type: 'name', op: '~', value: token.value };
    }

    function parseComparison(field) {
      var opToken = take();
      var op = opToken.type === 'word' ? 'has' : opToken.value;
      if (op === ':') {
        var nextToken = peek();
        if (nextToken && nextToken.type === 'op' && nextToken.value !== ':') op = take().value;
        else op = defaultQueryOp(field);
      }
      var valueToken = peek();
      if (!valueToken || (valueToken.type !== 'word' && valueToken.type !== 'value')) throw queryError('queryValue');
      take();
      var range = !valueToken.quoted && parseQueryRange(valueToken.value);
      if (range) {
        if (!(isQueryNumeric(field) && op === '=')) throw queryError('queryOp');
        op = 'range';
      }
      validateQueryOp(field, op);
      var node = {
        type: 'cmp',
        field: field,
        op: op,
        value: range || valueToken.value,
        quoted: !!valueToken.quoted,
      };
      if (field === 'team') {
        var team = canonicalTeam(valueToken.value);
        if (!team) throw queryError('queryTeam');
        node.team = team;
      }
      if (isQueryFlag(field)) {
        var flagValue = parseQueryBool(valueToken.value);
        if (flagValue == null) throw queryError('queryValue');
        node.flag = flagValue;
      }
      return node;
    }

    var ast = parseOr();
    if (peek()) throw queryError('queryTail');
    var predicate = function (portal) {
      return evalQuery(ast, portal) === true;
    };
    predicate.raw = function (portal) {
      return evalQuery(ast, portal);
    };
    predicate.needsGraph = queryNodeNeedsGraph(ast);
    predicate.needsHistory = queryNodeNeedsHistory(ast);
    return predicate;
  }

  function defaultQueryOp(field) {
    if (field === 'name') return '~';
    return '=';
  }

  function isQueryNumeric(field) {
    return field === 'level' || field === 'health' || field === 'res' ||
      field === 'links' || field === 'fields' || field === 'ap';
  }

  function validateQueryOp(field, op) {
    var numeric = { '=': 1, '!=': 1, '>': 1, '>=': 1, '<': 1, '<=': 1, range: 1 };
    var text = { '=': 1, '!=': 1, '~': 1 };
    if (field === 'name') {
      if (!text[op]) throw queryError('queryOp');
      return;
    }
    if (field === 'team' || isQueryFlag(field)) {
      if (op !== '=' && op !== '!=') throw queryError('queryOp');
      return;
    }
    if (!numeric[op]) throw queryError('queryOp');
  }

  function parseQueryRange(value) {
    var match = /^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/.exec(String(value));
    if (!match) return null;
    return [Number(match[1]), Number(match[2])];
  }

  function parseQueryNumber(value) {
    if (typeof value === 'number') return value;
    if (!/^-?\d+(?:\.\d+)?$/.test(String(value))) return null;
    return Number(value);
  }

  function parseQueryBool(value) {
    var key = String(value).trim().toLowerCase();
    if (key === 'true' || key === 'yes' || key === '1' || key === '是') return true;
    if (key === 'false' || key === 'no' || key === '0' || key === '否') return false;
    return null;
  }

  function canonicalTeam(value) {
    var key = String(value).trim().toLowerCase();
    var map = {
      enl: 'enl', e: 'enl', enlightened: 'enl', green: 'enl', '绿': 'enl', '启蒙': 'enl',
      res: 'res', r: 'res', resistance: 'res', blue: 'res', '蓝': 'res', '抵抗': 'res',
      neu: 'neu', n: 'neu', neutral: 'neu', none: 'neu', '白': 'neu', '中立': 'neu', '灰': 'neu',
      mac: 'mac', machina: 'mac', '红': 'mac',
      friendly: 'friendly', '友方': 'friendly', '我方': 'friendly',
      enemy: 'enemy', '敌方': 'enemy',
    };
    return map[key] || null;
  }

  function queryNodeNeedsGraph(node) {
    if (!node) return false;
    if (node.type === 'cmp') return node.field === 'links' || node.field === 'fields' || node.field === 'ap';
    if (node.type === 'not') return queryNodeNeedsGraph(node.arg);
    if (node.type === 'and' || node.type === 'or') {
      return queryNodeNeedsGraph(node.left) || queryNodeNeedsGraph(node.right);
    }
    return false;
  }

  function queryNodeNeedsHistory(node) {
    if (!node) return false;
    if (node.type === 'flag') return true;
    if (node.type === 'cmp') return isQueryFlag(node.field);
    if (node.type === 'not') return queryNodeNeedsHistory(node.arg);
    if (node.type === 'and' || node.type === 'or') {
      return queryNodeNeedsHistory(node.left) || queryNodeNeedsHistory(node.right);
    }
    return false;
  }

  function evalQuery(node, portal) {
    if (node.type === 'or') return evalQueryOr(evalQuery(node.left, portal), evalQuery(node.right, portal));
    if (node.type === 'and') return evalQueryAnd(evalQuery(node.left, portal), evalQuery(node.right, portal));
    if (node.type === 'not') return evalQueryNot(evalQuery(node.arg, portal));
    if (node.type === 'name') return cmpQueryString(queryPortalName(portal), node.op, node.value);
    if (node.type === 'flag') {
      var flag = evalQueryFlag(portal, node.field);
      if (flag === 'unknown') return 'unknown';
      return flag === true;
    }
    return evalQueryCmp(node, portal);
  }

  function evalQueryOr(left, right) {
    if (left === true || right === true) return true;
    if (left === false && right === false) return false;
    return 'unknown';
  }

  function evalQueryAnd(left, right) {
    if (left === false || right === false) return false;
    if (left === true && right === true) return true;
    return 'unknown';
  }

  function evalQueryNot(value) {
    if (value === 'unknown') return 'unknown';
    return !value;
  }

  function queryPortalData(portal) {
    return (portal && portal.options && portal.options.data) || {};
  }

  function queryPortalName(portal) {
    var title = queryPortalData(portal).title;
    return title == null ? '' : String(title);
  }

  function portalLevelOf(portal) {
    if (!portal || !portal.options || portal.options.team === window.TEAM_NONE) return 0;
    var level = parseInt(portal.options.data && portal.options.data.level != null
      ? portal.options.data.level
      : portal.options.level, 10);
    var maxLevel = window.MAX_PORTAL_LEVEL || 8;
    if (isNaN(level) || level < 0) return 0;
    return level > maxLevel ? maxLevel : level;
  }

  function queryKnownNumber(value) {
    if (value == null || value === '') return null;
    var number = Number(value);
    return isNaN(number) ? null : number;
  }

  function queryPlayerName() {
    return window.PLAYER && window.PLAYER.nickname ? String(window.PLAYER.nickname) : '';
  }

  function queryPlayerTeam() {
    if (!window.PLAYER || typeof window.teamStringToId !== 'function') return null;
    var team = window.teamStringToId(window.PLAYER.team);
    return team == null ? null : team;
  }

  function queryTeamId(token) {
    if (token === 'enl') return window.TEAM_ENL != null ? window.TEAM_ENL : 2;
    if (token === 'res') return window.TEAM_RES != null ? window.TEAM_RES : 1;
    if (token === 'neu') return window.TEAM_NONE != null ? window.TEAM_NONE : 0;
    if (token === 'mac') return window.TEAM_MAC != null ? window.TEAM_MAC : null;
    return null;
  }

  function queryResolveText(value, quoted) {
    if (!quoted && String(value).toLowerCase() === 'me') return queryPlayerName();
    return String(value);
  }

  function cmpQueryString(actual, op, expected) {
    var left = String(actual == null ? '' : actual).toLowerCase();
    var right = String(expected == null ? '' : expected).toLowerCase();
    if (op === '=') return left === right;
    if (op === '!=') return left !== right;
    if (op === '~') return left.indexOf(right) >= 0;
    return false;
  }

  function cmpQueryNumber(actual, op, expected) {
    if (actual == null) return 'unknown';
    if (op === 'range') {
      var low = expected[0];
      var high = expected[1];
      if (low > high) {
        var swap = low;
        low = high;
        high = swap;
      }
      return actual >= low && actual <= high;
    }
    var number = parseQueryNumber(expected);
    if (number == null) return false;
    if (op === '=') return actual === number;
    if (op === '!=') return actual !== number;
    if (op === '>') return actual > number;
    if (op === '>=') return actual >= number;
    if (op === '<') return actual < number;
    if (op === '<=') return actual <= number;
    return false;
  }

  function evalQueryTeam(portal, node) {
    var team = portal.options.team;
    var token = node.team;
    var matches;
    if (token === 'friendly' || token === 'enemy') {
      var mine = queryPlayerTeam();
      if (mine == null) return 'unknown';
      if (token === 'friendly') matches = team === mine;
      else matches = team !== window.TEAM_NONE && team !== mine;
    } else {
      var id = queryTeamId(token);
      if (id == null) return false;
      matches = team === id;
    }
    return node.op === '!=' ? !matches : matches;
  }

  var graphIndex = null;

  function invalidateGraph() {
    graphIndex = null;
  }

  function graphCounts() {
    if (graphIndex) return graphIndex;
    var links = Object.create(null);
    var fields = Object.create(null);
    var linkMap = window.links || {};
    var fieldMap = window.fields || {};
    var guid;
    for (guid in linkMap) {
      var linkData = linkMap[guid].options && linkMap[guid].options.data;
      if (!linkData) continue;
      if (linkData.oGuid) links[linkData.oGuid] = (links[linkData.oGuid] || 0) + 1;
      if (linkData.dGuid) links[linkData.dGuid] = (links[linkData.dGuid] || 0) + 1;
    }
    for (guid in fieldMap) {
      var fieldData = fieldMap[guid].options && fieldMap[guid].options.data;
      var points = fieldData && fieldData.points;
      if (!points) continue;
      for (var i = 0; i < points.length; i++) {
        var id = points[i] && points[i].guid;
        if (id) fields[id] = (fields[id] || 0) + 1;
      }
    }
    graphIndex = { links: links, fields: fields };
    return graphIndex;
  }

  function queryLinkCount(portal) {
    var guid = portal && portal.options && portal.options.guid;
    if (!guid) return null;
    return graphCounts().links[guid] || 0;
  }

  function queryFieldCount(portal) {
    var guid = portal && portal.options && portal.options.guid;
    if (!guid) return null;
    return graphCounts().fields[guid] || 0;
  }

  function enemyAp(resCount, linkCount, fieldCount) {
    var deploy = window.DEPLOY_RESONATOR || 125;
    var capture = window.CAPTURE_PORTAL || 675;
    var completion = window.COMPLETION_BONUS || 250;
    var destroyReso = window.DESTROY_RESONATOR || 75;
    var destroyLink = window.DESTROY_LINK || 187;
    var destroyField = window.DESTROY_FIELD || 750;
    var destroyAp = resCount * destroyReso + linkCount * destroyLink + fieldCount * destroyField;
    var captureAp = capture + 8 * deploy + completion;
    return destroyAp + captureAp;
  }

  function queryEnemyAp(portal) {
    var resCount = queryKnownNumber(queryPortalData(portal).resCount);
    var links = queryLinkCount(portal);
    var fields = queryFieldCount(portal);
    if (resCount == null || links == null || fields == null) return null;
    return enemyAp(resCount, links, fields);
  }

  function portalHistory(portal) {
    var data = portal && portal.options && portal.options.data;
    if (!data) return null;
    if (data.history) return data.history;
    var guid = portal.options.guid;
    var detail = window.portalDetail;
    if (!guid || !detail || typeof detail.get !== 'function') return null;
    var cached;
    try {
      cached = detail.get(guid);
    } catch (err) {
      return null;
    }
    if (!cached || !cached.history) return null;
    data.history = cached.history;
    return data.history;
  }

  function evalQueryFlag(portal, field) {
    var history = portalHistory(portal);
    if (!history) return 'unknown';
    if (field === 'captured') return !!history.captured;
    if (field === 'scout') return !!history.scoutControlled;
    return !!(history.visited || history.captured);
  }

  function evalQueryCmp(node, portal) {
    var field = node.field;
    var data = queryPortalData(portal);
    if (field === 'level') return cmpQueryNumber(portalLevelOf(portal), node.op, node.value);
    if (field === 'team') return evalQueryTeam(portal, node);
    if (field === 'health') return cmpQueryNumber(queryKnownNumber(data.health), node.op, node.value);
    if (field === 'res') return cmpQueryNumber(queryKnownNumber(data.resCount), node.op, node.value);
    if (field === 'links') return cmpQueryNumber(queryLinkCount(portal), node.op, node.value);
    if (field === 'fields') return cmpQueryNumber(queryFieldCount(portal), node.op, node.value);
    if (field === 'ap') return cmpQueryNumber(queryEnemyAp(portal), node.op, node.value);
    if (field === 'name') return cmpQueryString(queryPortalName(portal), node.op, queryResolveText(node.value, node.quoted));
    if (isQueryFlag(field)) {
      var flag = evalQueryFlag(portal, field);
      if (flag === 'unknown') return 'unknown';
      var wanted = node.flag === true;
      var match = flag === wanted;
      return node.op === '!=' ? !match : match;
    }
    return false;
  }

  window.plugin.portalfilter.compileQuery = compilePortalQuery;
  window.plugin.portalfilter.invalidateGraph = invalidateGraph;

  var ns = window.plugin.portalfilter;
  ns.queryText = '';
  ns.predicate = null;
  ns.queryError = false;
  ns.queryErrorMessage = '';
  ns.ui = null;
  ns.refreshTimer = 0;
  ns.ornamentTimer = 0;
  ns.historyGeneration = 0;
  ns.historyTimer = 0;
  ns.historyPumping = false;
  ns.historyQueue = [];
  ns.historyQueued = Object.create(null);
  ns.historyRefilterTimer = 0;

  function portalMatches(portal) {
    var predicate = ns.predicate;
    if (!predicate) return true;
    try {
      return predicate(portal) === true;
    } catch (err) {
      return false;
    }
  }

  // IITC.filters hides an entity when the predicate returns true.
  function hidePortal(portal) {
    return !portalMatches(portal);
  }

  function refilter() {
    invalidateGraph();
    var filters = window.IITC && window.IITC.filters;
    if (filters && typeof filters.set === 'function') {
      if (ns.predicate) filters.set(FILTER_NAME, { portal: true, pred: hidePortal });
      else if (typeof filters.remove === 'function') filters.remove(FILTER_NAME);
      if (window.portals && typeof filters.filterEntities === 'function') filters.filterEntities();
    } else if (window.portals) {
      for (var guid in window.portals) {
        var portal = window.portals[guid];
        if (!portal) continue;
        if (ns.predicate && hidePortal(portal)) {
          if (typeof portal.remove === 'function') portal.remove();
        } else if (window.map && typeof portal.addTo === 'function' && !portal._map) {
          portal.addTo(window.map);
        }
      }
    }
    syncHiddenPortals();
  }

  function syncHiddenPortals() {
    if (!window.portals) return;
    for (var guid in window.portals) {
      var portal = window.portals[guid];
      if (!portal) continue;
      // addPortalToMapLayer does not remove a portal that is already drawn,
      // so an update that stops matching has to be taken off the map here.
      if (ns.predicate && hidePortal(portal)) {
        if (portal._map && typeof portal.remove === 'function') portal.remove();
        if (window.ornaments && typeof window.ornaments.removePortal === 'function') {
          window.ornaments.removePortal(portal);
        }
      } else if (portal._map && window.ornaments && typeof window.ornaments.addPortal === 'function' &&
        (!window.ornaments._portals || !window.ornaments._portals[guid])) {
        window.ornaments.addPortal(portal);
      }
    }
  }

  function scheduleRefilter() {
    if (!ns.predicate || !ns.predicate.needsGraph) {
      invalidateGraph();
      return;
    }
    if (ns.refreshTimer) clearTimeout(ns.refreshTimer);
    ns.refreshTimer = setTimeout(function () {
      ns.refreshTimer = 0;
      refilter();
    }, 80);
  }

  function scheduleOrnamentSync() {
    if (!ns.predicate || ns.ornamentTimer) return;
    ns.ornamentTimer = setTimeout(function () {
      ns.ornamentTimer = 0;
      syncHiddenPortals();
    }, 0);
  }

  function loadStoredQuery() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (err) {
      return '';
    }
  }

  function persistQuery(text) {
    try {
      if (text) localStorage.setItem(STORAGE_KEY, text);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // Private mode can reject storage; the filter still applies for this session.
    }
  }

  function setHistoryStatus() {
    var ui = ns.ui;
    if (!ui || !ui.status) return;
    var left = ns.historyQueue ? ns.historyQueue.length : 0;
    if (!left || !ns.predicate || !ns.predicate.needsHistory) {
      ui.status.hidden = true;
      ui.status.textContent = '';
      return;
    }
    ui.status.hidden = false;
    ui.status.textContent = t('loadingHistory', { n: left });
  }

  function resetHistoryQueue() {
    ns.historyGeneration = (ns.historyGeneration || 0) + 1;
    if (ns.historyTimer) {
      clearTimeout(ns.historyTimer);
      ns.historyTimer = 0;
    }
    ns.historyPumping = false;
    ns.historyQueue = [];
    ns.historyQueued = Object.create(null);
    setHistoryStatus();
  }

  function historyStillUnknown(portal) {
    if (!ns.predicate || !ns.predicate.needsHistory || !ns.predicate.raw) return false;
    if (portalHistory(portal)) return false;
    return ns.predicate.raw(portal) === 'unknown';
  }

  function enqueueHistoryGuid(guid) {
    if (!guid || ns.historyQueued[guid]) return;
    ns.historyQueued[guid] = true;
    ns.historyQueue.push(guid);
    setHistoryStatus();
  }

  function scheduleHistoryRefilter() {
    if (ns.historyRefilterTimer) return;
    ns.historyRefilterTimer = setTimeout(function () {
      ns.historyRefilterTimer = 0;
      if (ns.predicate && ns.predicate.needsHistory) refilter();
    }, 80);
  }

  function pumpHistory() {
    if (ns.historyPumping) return;
    if (!window.portalDetail || typeof window.portalDetail.request !== 'function') {
      ns.historyQueue = [];
      setHistoryStatus();
      return;
    }
    ns.historyPumping = true;
    var generation = ns.historyGeneration;
    var step = function () {
      if (generation !== ns.historyGeneration) return;
      if (!ns.predicate || !ns.predicate.needsHistory || !ns.historyQueue.length) {
        ns.historyPumping = false;
        setHistoryStatus();
        return;
      }
      var guid = ns.historyQueue.shift();
      setHistoryStatus();
      var portal = window.portals && window.portals[guid];
      if (!portal || !historyStillUnknown(portal)) {
        ns.historyTimer = setTimeout(step, 0);
        return;
      }
      var request = null;
      try {
        request = window.portalDetail.request(guid);
      } catch (err) {
        request = null;
      }
      var done = function () {
        if (generation !== ns.historyGeneration) return;
        var live = window.portals && window.portals[guid];
        if (live) portalHistory(live);
        scheduleHistoryRefilter();
        ns.historyTimer = setTimeout(step, 100);
      };
      if (request && typeof request.always === 'function') request.always(done);
      else if (request && typeof request.then === 'function') request.then(done, done);
      else done();
    };
    step();
  }

  function ensureHistory() {
    resetHistoryQueue();
    if (!ns.predicate || !ns.predicate.needsHistory || !window.portals) return;
    for (var guid in window.portals) {
      if (historyStillUnknown(window.portals[guid])) enqueueHistoryGuid(guid);
    }
    if (ns.historyQueue.length) pumpHistory();
  }

  function onPortalDetailLoaded(data) {
    if (!data || !data.success || !data.guid || !ns.predicate || !ns.predicate.needsHistory) return;
    var portal = window.portals && window.portals[data.guid];
    if (portal && portal.options && portal.options.data && data.details && data.details.history) {
      portal.options.data.history = data.details.history;
    } else if (portal) {
      portalHistory(portal);
    }
    scheduleHistoryRefilter();
  }

  function setQueryState(invalid, message) {
    ns.queryError = !!invalid;
    ns.queryErrorMessage = invalid ? (message || t('queryInvalid')) : '';
    var ui = ns.ui;
    if (!ui) return;
    ui.input.classList.toggle('query-error', !!invalid);
    ui.input.title = ns.queryErrorMessage || t('queryTip');
    ui.message.textContent = ns.queryErrorMessage;
    ui.message.hidden = !ns.queryErrorMessage;
    ui.root.classList.toggle('is-active', !!ns.predicate);
  }

  function applyQueryText(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) {
      ns.queryText = text || '';
      ns.predicate = null;
      setQueryState(false);
      persistQuery('');
      refilter();
      ensureHistory();
      return;
    }
    try {
      ns.predicate = compilePortalQuery(trimmed);
      ns.queryText = text;
      setQueryState(false);
      persistQuery(text);
      refilter();
      ensureHistory();
    } catch (err) {
      setQueryState(true, err && err.message);
    }
  }

  function applyFromInput() {
    if (!ns.ui) return;
    applyQueryText(ns.ui.input.value);
  }

  function resetQuery() {
    if (ns.ui) ns.ui.input.value = '';
    applyQueryText('');
  }

  function showHelp() {
    var html = '<div class="portal-filter-help">' + helpBodyHtml() + '</div>';
    if (typeof window.dialog === 'function') {
      window.dialog({
        title: t('title'),
        id: 'portal-filter-help',
        html: html,
        width: Math.min(window.innerWidth - 24, 560),
        height: Math.min(window.innerHeight - 80, 520),
      });
    }
  }

  function actionButton(label, title, action) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', action);
    return button;
  }

  function mountControl() {
    if (document.getElementById('portal-filter')) return;
    var sidebar = document.getElementById('sidebar');
    var toolbox = document.getElementById('toolbox_component') || document.getElementById('toolbox');
    if (!sidebar && !toolbox) return;

    var root = document.createElement('div');
    root.id = 'portal-filter';
    var heading = document.createElement('div');
    heading.className = 'portal-filter-title';
    heading.textContent = 'Portal Filter';
    var row = document.createElement('div');
    row.className = 'portal-filter-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'portal-filter-input';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = t('queryPlaceholder');
    input.title = t('queryTip');
    input.setAttribute('aria-label', t('queryFilter'));
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        applyFromInput();
      }
    });
    input.addEventListener('input', function () {
      input.classList.remove('query-error');
      ns.queryError = false;
      ns.queryErrorMessage = '';
      input.title = t('queryTip');
      if (ns.ui) {
        ns.ui.message.textContent = '';
        ns.ui.message.hidden = true;
      }
    });
    row.appendChild(input);

    var actions = document.createElement('div');
    actions.className = 'portal-filter-actions';
    actions.appendChild(actionButton(t('queryFilter'), t('queryTip'), applyFromInput));
    actions.appendChild(actionButton(t('queryReset'), t('queryTip'), resetQuery));
    actions.appendChild(actionButton('?', t('help'), showHelp));

    var message = document.createElement('div');
    message.className = 'portal-filter-message';
    message.hidden = true;
    var status = document.createElement('div');
    status.className = 'portal-filter-status';
    status.hidden = true;

    root.appendChild(heading);
    root.appendChild(row);
    root.appendChild(actions);
    root.appendChild(message);
    root.appendChild(status);

    if (toolbox && toolbox.parentNode) toolbox.parentNode.insertBefore(root, toolbox);
    else sidebar.appendChild(root);

    ns.ui = { root: root, input: input, message: message, status: status };
  }

  function installCss() {
    if (document.getElementById('portal-filter-css')) return;
    var style = document.createElement('style');
    style.id = 'portal-filter-css';
    style.textContent = '#portal-filter {\n  padding: 6px 8px 8px;\n  color: #eee;\n}\n\n#portal-filter .portal-filter-title {\n  display: block;\n  margin: 0 0 4px;\n  color: #ffce00;\n  font-size: 15px;\n  line-height: 20px;\n}\n\n#portal-filter .portal-filter-row {\n  display: flex;\n  align-items: center;\n}\n\n#portal-filter .portal-filter-input {\n  flex: 1 1 auto;\n  min-width: 0;\n  width: 100%;\n}\n\n#portal-filter .portal-filter-input.query-error {\n  color: #ff4d4d;\n}\n\n#portal-filter.is-active .portal-filter-input {\n  box-shadow: inset 0 0 0 1px #ffce00;\n}\n\n#portal-filter .portal-filter-actions {\n  display: flex;\n  gap: 4px;\n  margin-top: 4px;\n}\n\n#portal-filter .portal-filter-actions button {\n  background: none;\n  border: 0;\n  color: #ffce00;\n  font: inherit;\n  line-height: 22px;\n  padding: 0 4px;\n}\n\n#portal-filter .portal-filter-actions button:hover {\n  text-decoration: underline;\n}\n\nbody.smartphone #portal-filter .portal-filter-actions button {\n  border: 2px outset #20a8b1;\n  padding: 4px 8px;\n  text-decoration: none;\n}\n\n#portal-filter .portal-filter-message {\n  margin: 4px 0 0;\n  color: #ff4d4d;\n  font-size: 12px;\n  line-height: 1.35;\n  word-break: break-word;\n}\n\n#portal-filter .portal-filter-status {\n  margin: 4px 0 0;\n  color: #ffce00;\n  font-size: 12px;\n  line-height: 1.35;\n}\n\n.portal-filter-help h3 {\n  margin: 12px 0 6px;\n  color: #ffce00;\n  font-size: 15px;\n}\n\n.portal-filter-help p,\n.portal-filter-help li {\n  margin: 4px 0;\n}\n\n.portal-filter-help ul {\n  margin: 4px 0 8px;\n  padding-left: 1.2em;\n}\n\n.portal-filter-help code {\n  font-family: Menlo, Consolas, monospace;\n  font-size: 12px;\n}\n';
    (document.head || document.documentElement).appendChild(style);
  }

  function onPortalAdded(data) {
    scheduleOrnamentSync();
    var portal = data && data.portal;
    if (!portal || !historyStillUnknown(portal)) return;
    var guid = portal.options && portal.options.guid;
    enqueueHistoryGuid(guid);
    pumpHistory();
  }

  var setup = function () {
    if (ns._ready) return;
    ns._ready = true;
    installCss();
    mountControl();

    var stored = loadStoredQuery();
    if (ns.ui) ns.ui.input.value = stored;
    if (stored.trim()) applyQueryText(stored);

    if (window.addHook) {
      window.addHook('portalAdded', onPortalAdded);
      window.addHook('linkAdded', scheduleRefilter);
      window.addHook('linkRemoved', scheduleRefilter);
      window.addHook('fieldAdded', scheduleRefilter);
      window.addHook('fieldRemoved', scheduleRefilter);
      window.addHook('mapDataRefreshEnd', scheduleRefilter);
      window.addHook('portalDetailLoaded', onPortalDetailLoaded);
    }
  };

  setup.info = plugin_info;
  if (typeof changelog !== 'undefined') setup.info.changelog = changelog;
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  // if IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
