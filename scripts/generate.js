import { PATH_JSON_FILE, PATH_MD_FILE } from './config.js';

import fs from 'fs';
import json2md from 'json2md';

/** JSON 转 Markdown */
export function generateMarkdown() {
  try {

    console.info('开始生成 Markdown');

    let jsonContent = fs.readFileSync(PATH_JSON_FILE, {
      encoding: 'utf-8',
    });
    let jsonParsed = JSON.parse(jsonContent);

    /** @type {json2md.DataObject[]} */
    let jsonMarkdown = [{
      table: {
        headers: [
          '开始时间',
          '结束时间',
          '直播内容',
          '备注',
        ],
        rows: [],
      },
    }];

    let tableRows = jsonMarkdown[0].table.rows;
    let result = ''

    jsonParsed.timeline.forEach((data) => {

      let content = String(data.content || '');

      if (content) {
        content = content.split(' / ').map((v) => {
          return `- ${v}`;
        }).join('<br>');
      }

      tableRows.push([
        data.startTime || '',
        data.endTime || '',
        content,
        data.remarks || '',
      ]);

    });

    result = json2md(jsonMarkdown);

    if (result) {
      fs.writeFileSync(PATH_MD_FILE, result, {
        encoding: 'utf-8',
        flag: 'w',
      });
      console.info('文件生成完毕');
      return true;
    } else {
      console.error('文件生成失败');
      return false;
    }

  } catch (error) {

    console.error('文件生成出错：');
    console.error(error);

    return false;

  }
}
