"""Печатает упавшие тесты и сообщения об ошибках из `xcresulttool get test-results tests` (для лога CI)."""
import json
import sys


def walk(node, test=None):
    kind = node.get("nodeType")
    name = node.get("name", "")
    if kind == "Test Case":
        test = name
    if kind == "Failure Message":
        print(f"✗ {test}: {name}")
    for child in node.get("children", []):
        walk(child, test)


with open(sys.argv[1]) as f:
    for root in json.load(f).get("testNodes", []):
        walk(root)
