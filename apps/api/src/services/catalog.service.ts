import { AppError } from '../utils/errors.js';
import { catalogRepo } from '../repositories/catalog.repo.js';

export const catalogService = {
  quote(input: { serviceId: string; length: string; effectIds: string[]; includeRemoval: boolean }) {
    const service = catalogRepo.findService(input.serviceId);
    if (!service || !service.active) {
      throw new AppError('NOT_FOUND', 404, 'Service not found');
    }
    const length = catalogRepo.findLengthByCode(input.length);
    if (!length || !length.active) {
      throw new AppError('VALIDATION_ERROR', 422, 'Invalid nail length');
    }

    const selectedEffects = [];
    for (const id of input.effectIds) {
      const eff = catalogRepo.findEffect(id);
      if (!eff || !eff.active) {
        throw new AppError('VALIDATION_ERROR', 422, 'Invalid effect id');
      }
      selectedEffects.push(eff);
    }

    const effectsPrice = selectedEffects.reduce((sum, e) => sum + e.price, 0);
    const effectsDuration = selectedEffects.reduce((sum, e) => sum + e.durationMin, 0);

    let removalPrice = 0;
    let removalDuration = 0;
    if (input.includeRemoval) {
      const removal = catalogRepo.listEffects('REMOVAL', false)[0]
        ?? catalogRepo.listEffects('REMOVAL', true)[0];
      if (removal) {
        removalPrice = removal.price;
        removalDuration = removal.durationMin;
      }
    }

    const base = service.basePrice;
    const lengthPrice = length.priceModifier;
    const priceTotal = base + lengthPrice + effectsPrice + removalPrice;
    const durationMin = service.baseDurationMin + length.durationModifier + effectsDuration + removalDuration;

    return {
      priceTotal,
      durationMin,
      breakdown: {
        base,
        length: lengthPrice,
        effects: effectsPrice,
        removal: removalPrice,
      },
    };
  },
};