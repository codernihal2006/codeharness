import { Command } from 'commander';
import { getCatalog } from '../providers/model-catalog.js';
import { fetchOpenRouterModels } from '../providers/openrouter.js';
export function modelsCommand(): Command {
  return new Command('models')
    .description('List catalogued models')
    .action(async () => {
      const { catalog, stale } = await getCatalog();
      if (stale)
        console.error(
          'Warning: using stale or unavailable model catalog cache.',
        );
      for (const [provider, models] of Object.entries(catalog))
        for (const model of models)
          console.log(
            `${provider}/${model.id}${model.name ? `\t${model.name}` : ''}`,
          );
      try {
        console.log('openrouter/openrouter/free\tOpenRouter Free Model Router');
        for (const model of await fetchOpenRouterModels())
          console.log(
            `openrouter/${model.id}${model.name ? `\t${model.name}` : ''}`,
          );
      } catch {
        console.error('Warning: OpenRouter model catalog unavailable.');
      }
    });
}
