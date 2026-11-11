---
name: live-recording-timeline
description: 扫描本地直播录制目录，按录制文件命名规则划分场次，将 startTime/endTime 条目补充到 data.json。当用户要求“根据录制文件补充条目”“同步直播录制到 timeline”或类似意图时使用。不适用于修改已有条目 content 或手动指定时间的场景。
---

# 直播录制时间线同步

从本地录制目录读取文件，按场次生成 timeline 条目并写入 `data.json`。

## 录制目录

同时扫描以下目录（不存在则跳过）：

- `C:\Temp\rec`
- `D:\Temp\rec`
- `E:\Programs\BililiveRecorder\data\rec`

## 场次划分规则

1. 文件名以 `-` 结尾（扩展名前最后一个字符为 `-`，例如 `...-035212-923-.flv`）的文件是该场直播的**最后一个录制文件**，即场次结束标记。
2. 两个相邻“-”标记文件之间的所有文件（包括后一个标记文件）属于同一场直播。
3. 第一个标记文件之前的文件属于第一场直播。
4. 按文件创建时间（CreationTime）升序排列后再划分。

## 时间计算

- **startTime**：该场第一个文件的 CreationTime（精确到分钟，截断秒）。
- **endTime**：该场“-”标记文件的 LastWriteTime（精确到分钟，截断秒）。

### 异常处理

- **无标记文件的场次**：若某场没有“-”标记文件（如录制器中断），endTime 取该场最后一个文件的 LastWriteTime，并在结果中向用户说明。
- **0 字节标记文件**：若“-”标记文件大小为 0 字节，仍按规则取其 LastWriteTime 作为 endTime，但需向用户说明实际有内容的最后文件结束时间，由用户决定是否修正。
- **中途间断**：同一场内若存在较长时间间断（通常 >10 分钟），但因无“-”标记仍归为一场，需在结果中标注间断时长，由用户决定是否拆分。

## 写入 data.json

1. 读取 `data.json`，找到 `"timeline": [` 数组的第一个元素。
2. 将新条目按 startTime **倒序**（最新在前）插入到数组最前面。
3. 每条格式为：

   ```json
   {
     "startTime": "YYYY-MM-DD HH:MM",
     "endTime": "YYYY-MM-DD HH:MM",
     "content": ""
   }
   ```

4. `content` 固定为空字符串，不填写。
5. 写入后用 `ConvertFrom-Json` 校验 JSON 有效性。

## 去重

- 仅补充 data.json 中尚不存在的场次。以 startTime 作为去重依据：若某场的 startTime 已在现有条目中出现，则跳过该场。
- 建议先列出文件并 grep data.json 确认无重叠后再写入。

## 输出要求

完成后向用户汇报：

1. 新增条目的时间范围表格（startTime / endTime / 备注）。
2. 异常场次的说明（无标记、0 字节、中途间断）。
3. JSON 校验结果。
