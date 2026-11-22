// Usage: npx tsx scripts/plan.ts <Template> [props.json] > plan.json  — narration timing plan used by the cloud TTS
import fs from 'node:fs';
import {buildScenes, buildCaptions, cloudPlan} from '../src/narration/narration';
import {getTemplate} from '../src/remotion/registry';
const [tpl, pf] = process.argv.slice(2);
const props = {...getTemplate(tpl).defaultProps, ...(pf ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {})};
process.stdout.write(JSON.stringify(cloudPlan(buildCaptions(buildScenes(tpl, props))), null, 1));
