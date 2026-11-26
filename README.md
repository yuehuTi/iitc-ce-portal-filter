# IITC-CE Portal filter

在右侧 Toolbox 上方加一个过滤框，地图只显示符合表达式的 Portal。表达式沿用 [Portals list](https://github.com/yuehuTi/iitc-ce-portals-list) 的写法，但只用地图上已经有的数据。

不能使用需要读取 Portal 详情才能判断的插件（mods）、共振器（resonator）、主人（owner）和盾（shields）。

到访、占领和侦察可以写进表达式。地图上还没有这些记录时会去读 Portal 详情，读到后再筛；记录未知时先不显示，`NOT visited` 也不会把未知的 Portal 算进来。

可用字段：名字、等级、阵营、血量、共振器数量、链接数、区域数、敌方 AP、到访、占领、侦察。

```
level >= 6 AND team = ENL
等级:6..8 阵营 = 绿
name ~ park
team = enemy health < 50
```

点过滤或按回车生效。点重置，或把表达式清空后再过滤，恢复全部 Portal。表达式写错时输入标红，当前地图不变。上次成功的表达式会记住，刷新后继续生效。

## 文件

- `portal-filter.js`：IITC-CE 插件源码，构建时复制为 `plugins/portal-filter.js`
- `portal-filter.css`：复制为 `plugins/portal-filter.css`
- `portal-filter.user.js`：可直接安装的脚本

## 构建

在 IITC-CE 仓库中：

```bash
python3 build_plugin.py release plugins/portal-filter.js --out-dir /tmp/iitc-out
```

样式通过 `@include_string:portal-filter.css@` 打进脚本。不走构建时，直接安装 `portal-filter.user.js`。
