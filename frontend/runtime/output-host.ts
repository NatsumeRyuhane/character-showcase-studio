// Entry of the shell's output host, bundled by tools/build.mjs with Vite into one
// classic script in the shell page (outside the sandbox).
import { mountStudioOutputHost } from './studio-output-host.ts';

mountStudioOutputHost();
