import { Buffer } from "buffer";
import process from "process";

if (!globalThis.Buffer) globalThis.Buffer = Buffer;
if (!globalThis.process) globalThis.process = process;

// Some libs check `global`
if (!globalThis.global) globalThis.global = globalThis;
