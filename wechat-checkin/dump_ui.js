/**
 * 调试用：把当前屏幕上无障碍能读到的文字打到控制台和 logs/ui-dump.txt。
 * 卡在某一页时，先手动打开那一页，再运行本脚本。
 */
auto.waitFor();
console.show();
sleep(300);

var dir = (function () {
    try {
        var s = String(engines.myEngine().source);
        var i = s.lastIndexOf("/");
        if (i > 0) return s.slice(0, i + 1);
    } catch (e) { }
    return files.cwd() + "/";
})();
files.ensureDir(dir + "logs/");

var lines = [];
lines.push("pkg=" + currentPackage());
lines.push("act=" + currentActivity());
lines.push("size=" + device.width + "x" + device.height);
lines.push("");

var nodes = textMatches(".+").find();
var i, n, b;
for (i = 0; i < nodes.length; i++) {
    n = nodes[i];
    b = n.bounds();
    lines.push((n.text() || "") + "  " + (b ? b.toString() : ""));
}

var text = lines.join("\n");
console.log(text);
files.write(dir + "logs/ui-dump.txt", text);
toast("已写入 logs/ui-dump.txt，共 " + nodes.length + " 条");
