#!/usr/bin/env python3
import argparse
import hashlib
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import xml.etree.ElementTree as ET
from xml.dom import minidom

BASE = Path(__file__).resolve().parent
STATE = BASE / 'state.json'
FEED = BASE / 'feed.xml'
TZ = timezone(timedelta(hours=8))


def load_state():
    return json.loads(STATE.read_text(encoding='utf-8'))


def save_state(state):
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')


def normalize_text(text: str) -> str:
    lines = [line.strip() for line in text.replace('\r', '').split('\n')]
    lines = [line for line in lines if line]
    return '\n'.join(lines)


def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def now_rfc2822() -> str:
    dt = datetime.now(TZ)
    return dt.strftime('%a, %d %b %Y %H:%M:%S +0800')


def now_iso() -> str:
    return datetime.now(TZ).isoformat()


def parse_feed():
    return ET.parse(FEED)


def prettify_xml(elem):
    rough = ET.tostring(elem, encoding='utf-8')
    return minidom.parseString(rough).toprettyxml(indent='  ', encoding='utf-8')


def add_item(tree, title, link, description):
    root = tree.getroot()
    channel = root.find('channel')
    item = ET.Element('item')

    ET.SubElement(item, 'title').text = title
    ET.SubElement(item, 'link').text = link
    ET.SubElement(item, 'guid').text = f"customs-monitor-{hashlib.md5((title + now_iso()).encode()).hexdigest()}"
    ET.SubElement(item, 'pubDate').text = now_rfc2822()
    ET.SubElement(item, 'description').text = description

    items = channel.findall('item')
    if items:
        channel.insert(list(channel).index(items[0]), item)
    else:
        channel.append(item)

    lbd = channel.find('lastBuildDate')
    if lbd is not None:
        lbd.text = now_rfc2822()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text-file', required=True, help='页面签名文本文件（例如页面标题列表/链接列表）')
    ap.add_argument('--title', default='海关总署页面发生变化')
    args = ap.parse_args()

    text_path = Path(args.text_file)
    raw = text_path.read_text(encoding='utf-8')
    normalized = normalize_text(raw)
    new_hash = compute_hash(normalized)

    state = load_state()
    old_hash = state.get('last_hash')

    if new_hash == old_hash:
        print('NO_CHANGE')
        return

    tree = parse_feed()
    link = state['target_url']
    desc = (
        '检测到目标页面签名发生变化。\n\n'
        f'更新时间：{now_iso()}\n'
        '说明：当前 RSS 仅做变化通知，不保存正文。'
    )
    add_item(tree, args.title, link, desc)

    xml_bytes = prettify_xml(tree.getroot())
    FEED.write_bytes(xml_bytes)

    state['last_hash'] = new_hash
    state['last_text'] = normalized[:1000]
    save_state(state)

    print('UPDATED')


if __name__ == '__main__':
    main()
