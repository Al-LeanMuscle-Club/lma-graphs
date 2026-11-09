"""Run from each checked-out Needle repository with the same Python environment.

These are public API compatibility examples, not hidden task assessment inputs.
Original reference: cactus-compute/needle@278eea197d6a89a274d5505de757f5a3acb7ecfa
Use: python -B schema-probe.py (ensure the target repository is on the import path).
"""
import json
from typing import Annotated
from needle import Field, tool

def priority(value: Annotated[int, Field(description="annotation", ge=1)] = Field(le=10)):
    return value

def nested(values: list[Annotated[int, Field(ge=1)]]):
    return values

print(json.dumps({"priority": tool(priority)._needle_tool["parameters"],
                  "nested": tool(nested)._needle_tool["parameters"]}, indent=2, sort_keys=True))
