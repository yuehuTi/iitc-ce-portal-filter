# IITC-CE Portal filter
<img width="1397" height="369" alt="图片" src="https://github.com/user-attachments/assets/27b65f0d-d5d6-4933-9224-1b3f57c12ba8" />
<br>

<img width="1291" height="359" alt="图片" src="https://github.com/user-attachments/assets/7c5f6383-ccd0-4a68-92b9-758806df16fe" />

在右侧 Toolbox 上方加一个过滤框，地图只显示符合表达式的 Portal。表达式沿用 [Portals list](https://github.com/yuehuTi/iitc-ce-portals-list) 的写法，但只用地图上已经有的数据。

不能使用需要读取 Portal 详情才能判断的mods、resonator、owner和shields作为条件。

可用的字段：名字、等级、阵营、血量、共振器数量、link数、field数、敌方 AP、cap、visit、scout。

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
