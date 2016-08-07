import promisify from 'promisify-node';
const fs = promisify('fs');
import path from 'path';

export default function (req, res, { rulesRepository, metaRepository }, { params }) {
  const keyPath = params.splat;

  (async function () {
    const ruleData = await rulesRepository.getRule(keyPath);

    return {
      ruleDef: {
        type: path.extname(keyPath).substring(1),
        source: ruleData.fileContent,
        lastModifyDate: ruleData.lastModifyDate,
        modifierUser: ruleData.modifierUser,
        lastModifyCompareUrl: ruleData.lastModifyCompareUrl,
      },
      meta: await metaRepository.getRuleMeta(keyPath),
    };
  }()).then((x) => res.json(x), console.error.bind(console));
}
