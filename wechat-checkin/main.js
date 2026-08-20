/**
 * 暑假留校签到：21:30 用真实定位走微信小程序「打卡签到表」。
 * 定位过远 / 找不到控件 / 结果不明，一律停下来通知手签。
 * 兼容 AutoJs6 / AutoX.js（无障碍点击，不改定位、不走接口）。
 */

auto.waitFor();
try { auto.setMode("fast"); } catch (e) { }

var CFG = loadConfig();
var DIR = scriptDir();
var LOG_DIR = DIR + "logs/";
files.ensureDir(LOG_DIR);

var WX_PKG = "com.tencent.mm";
var RESULT = {
    ok: "ok",
    already: "already",
    tooFar: "too_far",
    fail: "fail",
    handoff: "handoff"
};

var popupGuard = null;

main();

function main() {
    device.keepScreenOn(10 * 60 * 1000);
    if (CFG.showConsole) {
        console.show();
        sleep(400);
    }

    logLine("==== 开始 " + nowText() + " dryRun=" + CFG.dryRun + " ====");

    try {
        if (!preparePhone()) return finish(RESULT.handoff, "屏幕唤不醒或微信拉不起来，请手签");

        popupGuard = startPopupGuard();

        if (!openMiniProgram()) return finish(RESULT.handoff, "打不开小程序「" + CFG.miniProgramName + "」，请手签");
        if (!waitHomePage()) return finish(RESULT.handoff, "8 秒内没看到活动首页，请手签");
        if (alreadySignedToday()) return finish(RESULT.already, "今天已经签过，脚本结束");

        dismissAd();
        if (!clickExact(CFG.signButton, 3000)) {
            return finish(RESULT.handoff, "找不到「" + CFG.signButton + "」，请手签");
        }

        if (!waitFormPage()) return finish(RESULT.handoff, "点了签到但没进入填写页，请手签");
        if (!fillName()) return finish(RESULT.handoff, "姓名对不上「" + CFG.name + "」，请手签");
        if (!pickLocation()) return finish(RESULT.handoff, "定位没选成功，请手签");
        if (!fillClass()) return finish(RESULT.handoff, "班级没填上，请手签");

        if (CFG.dryRun) {
            dumpWindow("dry-run-before-submit");
            return finish(RESULT.ok, "演练结束：表单已填好，未点确定。确认无误后把 config.json 里 dryRun 改为 false");
        }

        if (!clickBottomButton("确定")) return finish(RESULT.handoff, "找不到底部「确定」，请手签");

        var outcome = waitSubmitResult();
        if (outcome === RESULT.tooFar) return finish(RESULT.tooFar, "距离过远或不在范围，请手签");
        if (outcome === RESULT.fail) return finish(RESULT.fail, "签到失败，请手签");
        if (outcome === RESULT.ok || outcome === RESULT.already) {
            return finish(RESULT.ok, "签到成功");
        }
        return finish(RESULT.handoff, "提交后没看到明确成功/失败，请打开小程序确认并手签");
    } catch (e) {
        logLine("异常: " + e);
        return finish(RESULT.handoff, "脚本异常：" + e + "，请手签");
    } finally {
        device.cancelKeepingAwake();
        if (popupGuard) popupGuard.interrupt();
    }
}

function preparePhone() {
    if (!device.isScreenOn()) {
        device.wakeUp();
        sleep(800);
    }
    if (!device.isScreenOn()) {
        logLine("屏幕未能点亮");
        return false;
    }
    if (CFG.swipeUnlock) {
        swipe(device.width / 2, device.height * 0.82, device.width / 2, device.height * 0.28, 350);
        sleep(600);
    }

    app.launchPackage(WX_PKG);
    if (!waitPackage(WX_PKG, CFG.timeoutsMs.wechat)) {
        logLine("微信启动超时");
        return false;
    }
    sleep(1000);
    backToWechatHome();
    return currentPackage() === WX_PKG;
}

function backToWechatHome() {
    var i;
    for (i = 0; i < 6; i++) {
        if (isWechatHome()) {
            clickTab("微信");
            sleep(400);
            return;
        }
        back();
        sleep(350);
    }
    clickTab("微信");
    sleep(400);
}

function isWechatHome() {
    return currentPackage() === WX_PKG &&
        (text("微信").exists() || desc("微信").exists()) &&
        (desc("搜索").exists() || text("搜索").exists() || text("通讯录").exists());
}

function clickTab(name) {
    var nodes = text(name).find();
    var i, n, b;
    for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        b = n.bounds();
        if (b && b.centerY() > device.height * 0.85) {
            click(b.centerX(), b.centerY());
            return true;
        }
    }
    return false;
}

function openMiniProgram() {
    if (openFromRecentBar()) return true;
    return openFromSearch();
}

function openFromRecentBar() {
    logLine("尝试下拉最近使用");
    swipe(device.width / 2, device.height * 0.28, device.width / 2, device.height * 0.72, 420);
    sleep(900);
    if (clickText(CFG.miniProgramName, 1500)) {
        logLine("已从最近使用打开");
        return true;
    }
    back();
    sleep(400);
    return false;
}

function openFromSearch() {
    logLine("改走搜索打开小程序");
    if (!clickDescOrText("搜索", 2000)) {
        click(device.width - 70, statusBarClickY());
        sleep(500);
    }
    sleep(700);

    var box = className("android.widget.EditText").findOne(2500);
    if (box) {
        box.click();
        sleep(250);
        box.setText(CFG.miniProgramName);
    } else {
        setText(CFG.miniProgramName);
    }
    sleep(1400);

    if (text("小程序").exists()) {
        clickText("小程序", 800);
        sleep(600);
    }

    if (clickText(CFG.miniProgramName, 3000)) {
        sleep(1200);
        return true;
    }
    logLine("搜索结果里没点到小程序");
    dumpWindow("search-miss");
    return false;
}

function waitHomePage() {
    var deadline = Date.now() + CFG.timeoutsMs.page;
    while (Date.now() < deadline) {
        if (textContains(CFG.activityTitle).exists() || text(CFG.signButton).exists()) {
            logLine("已到活动首页");
            sleep(500);
            return true;
        }
        if (text("填写信息").exists() || textContains("姓名").exists()) {
            logLine("直接进了填写页");
            return true;
        }
        sleep(300);
    }
    dumpWindow("home-timeout");
    return false;
}

function alreadySignedToday() {
    var keys = ["今日已签", "今日已参与", "今天已签", "已完成签到"];
    var i;
    for (i = 0; i < keys.length; i++) {
        if (textContains(keys[i]).exists()) {
            logLine("命中已签文案: " + keys[i]);
            return true;
        }
    }
    return false;
}

function dismissAd() {
    if (text("立即下载").exists() || textContains("包邮到家").exists()) {
        logLine("避开广告，上滑露出签到按钮");
        swipe(device.width / 2, device.height * 0.72, device.width / 2, device.height * 0.42, 280);
        sleep(400);
    }
}

function waitFormPage() {
    var deadline = Date.now() + CFG.timeoutsMs.page;
    while (Date.now() < deadline) {
        if (text("填写信息").exists() || textContains("姓名").exists() || textContains("地理位置").exists()) {
            logLine("已到填写页");
            sleep(400);
            return true;
        }
        sleep(300);
    }
    dumpWindow("form-timeout");
    return false;
}

function fillName() {
    if (nameAlreadyFilled()) {
        logLine("姓名已是 " + CFG.name + "，跳过");
        return true;
    }

    if (text("从名单中选择").exists()) {
        clickText("从名单中选择", 800);
        sleep(700);
        if (clickText(CFG.name, 2500)) {
            sleep(500);
            if (nameAlreadyFilled()) return true;
        }
    }

    if (!clickBelowLabel(["*1. 姓名", "1. 姓名", "姓名"])) {
        logLine("没点到姓名输入框");
    }
    sleep(350);
    setText(CFG.name);
    sleep(400);
    hideKeyboard();

    if (nameAlreadyFilled()) return true;
    dumpWindow("name-mismatch");
    return false;
}

function nameAlreadyFilled() {
    var nodes = text(CFG.name).find();
    var i, b;
    for (i = 0; i < nodes.length; i++) {
        b = nodes[i].bounds();
        if (b && b.centerY() < device.height * 0.45) return true;
    }
    return false;
}

function pickLocation() {
    var loc = firstText(["定位"]);
    if (!loc) {
        dumpWindow("no-locate-label");
        return false;
    }
    var b = loc.bounds();
    click(Math.min(device.width - 20, b.right + dp(28)), b.centerY());
    sleep(400);
    if (!text("完成").exists() && !desc("完成").exists()) {
        loc.click();
    }

    if (!waitTextOrDesc("完成", CFG.timeoutsMs.map)) {
        dumpWindow("map-timeout");
        return false;
    }

    logLine("地图已出，等待定位点 " + CFG.timeoutsMs.gpsSettle + "ms");
    sleep(CFG.timeoutsMs.gpsSettle);

    if (!clickDescOrText("完成", 2000)) {
        dumpWindow("no-done");
        return false;
    }

    var deadline = Date.now() + CFG.timeoutsMs.page;
    while (Date.now() < deadline) {
        if (text("填写信息").exists() || textContains("地理位置").exists()) break;
        sleep(250);
    }
    sleep(400);

    if (locationLooksEmpty()) {
        dumpWindow("location-empty");
        return false;
    }
    logLine("定位已带回填写页");
    return true;
}

function locationLooksEmpty() {
    if (textContains("请选择").exists() && !textContains("区").exists()) return true;
    return false;
}

function fillClass() {
    if (text(CFG.className).exists()) {
        logLine("班级已是 " + CFG.className + "，跳过");
        return true;
    }
    if (!clickBelowLabel(["*3. 班级", "3. 班级", "班级"])) {
        logLine("没点到班级输入框，仍尝试输入");
    }
    sleep(350);
    setText(CFG.className);
    sleep(400);
    hideKeyboard();
    return text(CFG.className).exists();
}

function waitSubmitResult() {
    var deadline = Date.now() + CFG.timeoutsMs.result;
    var far = ["距离过远", "不在范围", "超出范围", "不在打卡范围", "超出打卡范围"];
    var bad = ["签到失败", "提交失败", "请填写完整"];
    var good = ["签到成功", "提交成功", "打卡成功"];
    var i;

    while (Date.now() < deadline) {
        for (i = 0; i < far.length; i++) if (textContains(far[i]).exists()) return RESULT.tooFar;
        for (i = 0; i < bad.length; i++) if (textContains(bad[i]).exists()) return RESULT.fail;
        for (i = 0; i < good.length; i++) if (textContains(good[i]).exists()) return RESULT.ok;
        if (alreadySignedToday()) return RESULT.already;
        if (text(CFG.signButton).exists() && textContains(CFG.activityTitle).exists()) {
            sleep(600);
            if (alreadySignedToday()) return RESULT.already;
        }
        sleep(350);
    }

    if (text(CFG.signButton).exists() || textContains(CFG.activityTitle).exists()) {
        if (alreadySignedToday()) return RESULT.already;
    }
    dumpWindow("result-unknown");
    return RESULT.handoff;
}

function finish(code, message) {
    logLine("结果[" + code + "] " + message);
    saveLastResult(code, message);
    snap("end-" + code);

    try {
        if (typeof notice === "function") {
            notice("暑假签到", message);
        }
    } catch (e) { }

    toastLog(message);
    if (code === RESULT.ok || code === RESULT.already) {
        device.vibrate(250);
    } else {
        device.vibrate([0, 400, 200, 400, 200, 400]);
    }
    return code;
}

function startPopupGuard() {
    return threads.start(function () {
        var allow = ["允许", "使用时允许", "仅在使用该应用时允许", "始终允许", "同意", "我知道了"];
        while (true) {
            var i, w;
            for (i = 0; i < allow.length; i++) {
                w = text(allow[i]).findOne(200);
                if (w) {
                    logLine("自动点弹窗: " + allow[i]);
                    w.click();
                    sleep(300);
                }
            }
            sleep(400);
        }
    });
}

function clickExact(name, timeout) {
    var w = text(name).findOne(timeout || 2000);
    if (!w) return false;
    var b = w.bounds();
    click(b.centerX(), b.centerY());
    logLine("点击「" + name + "」");
    return true;
}

function clickText(name, timeout) {
    var w = text(name).findOne(timeout || 2000);
    if (!w) w = textContains(name).findOne(200);
    if (!w) return false;
    var b = w.bounds();
    click(b.centerX(), b.centerY());
    logLine("点击「" + w.text() + "」");
    return true;
}

function clickDescOrText(name, timeout) {
    var w = desc(name).findOne(timeout || 1500);
    if (!w) w = text(name).findOne(400);
    if (!w) return false;
    var b = w.bounds();
    click(b.centerX(), b.centerY());
    return true;
}

function clickBottomButton(name) {
    var nodes = text(name).find();
    var best = null;
    var maxY = -1;
    var i, b;
    for (i = 0; i < nodes.length; i++) {
        b = nodes[i].bounds();
        if (b && b.centerY() > maxY) {
            maxY = b.centerY();
            best = nodes[i];
        }
    }
    if (!best) {
        dumpWindow("no-bottom-" + name);
        return false;
    }
    b = best.bounds();
    click(b.centerX(), b.centerY());
    logLine("点击底部「" + name + "」 y=" + b.centerY());
    return true;
}

function hideKeyboard() {
    click(device.width / 2, Math.max(80, Math.round(device.height * 0.08)));
    sleep(300);
}

function clickBelowLabel(labels) {
    var i, w, b;
    for (i = 0; i < labels.length; i++) {
        w = text(labels[i]).findOne(400);
        if (!w) w = textContains(labels[i]).findOne(200);
        if (!w) continue;
        b = w.bounds();
        click(b.centerX(), Math.min(device.height - 20, b.bottom + dp(28)));
        logLine("点击标签下方: " + labels[i]);
        return true;
    }
    return false;
}

function firstText(names) {
    var i, w;
    for (i = 0; i < names.length; i++) {
        w = text(names[i]).findOne(600);
        if (w) return w;
    }
    return null;
}

function waitTextOrDesc(name, timeout) {
    var deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (text(name).exists() || desc(name).exists()) return true;
        sleep(250);
    }
    return false;
}

function waitPackage(pkg, timeout) {
    var deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (currentPackage() === pkg) return true;
        sleep(250);
    }
    return false;
}

function statusBarClickY() {
    return Math.max(80, Math.round(device.height * 0.07));
}

function dp(n) {
    return Math.round(n * (device.density || 2));
}

function dumpWindow(tag) {
    var lines = ["==== UI " + tag + " pkg=" + currentPackage() + " ===="];
    var nodes;
    try {
        nodes = textMatches(".+").find();
    } catch (e) {
        logLine("dump 失败: " + e);
        return;
    }
    var i, n, t, b, limit;
    limit = Math.min(nodes.length, 50);
    for (i = 0; i < limit; i++) {
        n = nodes[i];
        t = n.text();
        b = n.bounds();
        if (t) lines.push(t + " @ " + (b ? b.toString() : "?"));
    }
    logLine(lines.join("\n"));
    snap(tag);
}

function snap(tag) {
    try {
        if (!requestScreenCaptureOnce()) return;
        var img = captureScreen();
        if (!img) return;
        var path = LOG_DIR + stamp() + "-" + tag + ".png";
        img.saveTo(path);
        img.recycle();
        logLine("截图 " + path);
    } catch (e) {
        logLine("截图跳过: " + e);
    }
}

var screenCaptureReady = false;
function requestScreenCaptureOnce() {
    if (screenCaptureReady) return true;
    try {
        screenCaptureReady = requestScreenCapture(false);
    } catch (e) {
        screenCaptureReady = false;
    }
    return screenCaptureReady;
}

function saveLastResult(code, message) {
    files.write(
        LOG_DIR + "last_result.txt",
        nowText() + "\n" + code + "\n" + message + "\n"
    );
}

function logLine(msg) {
    var line = nowText() + "  " + msg;
    console.log(line);
    try {
        files.append(LOG_DIR + "run.log", line + "\n");
    } catch (e) { }
}

function nowText() {
    return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
}

function stamp() {
    return new java.text.SimpleDateFormat("yyyyMMdd-HHmmss").format(new Date());
}

function scriptDir() {
    try {
        var src = engines.myEngine().source;
        if (src) {
            var s = String(src);
            var i = s.lastIndexOf("/");
            if (i > 0) return s.slice(0, i + 1);
        }
    } catch (e) { }
    return files.cwd() + "/";
}

function loadConfig() {
    var fallback = {
        name: "刘海欣",
        className: "计算机类2503班",
        miniProgramName: "打卡签到表",
        activityTitle: "暑假签到打卡",
        signButton: "点击签到",
        dryRun: true,
        showConsole: true,
        swipeUnlock: true,
        timeoutsMs: {
            wechat: 15000,
            page: 8000,
            map: 15000,
            gpsSettle: 2500,
            result: 5000
        }
    };
    try {
        var raw = files.read(scriptDir() + "config.json");
        var parsed = JSON.parse(raw);
        var k;
        for (k in parsed) fallback[k] = parsed[k];
        if (parsed.timeoutsMs) {
            for (k in parsed.timeoutsMs) fallback.timeoutsMs[k] = parsed.timeoutsMs[k];
        }
    } catch (e) {
        console.log("读 config.json 失败，用内置默认值: " + e);
    }
    return fallback;
}
