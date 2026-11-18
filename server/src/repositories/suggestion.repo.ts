import { BaseRepository } from './firestore.js';
import { Suggestion, SuggestionStatus } from '../types/index.js';

class SuggestionRepository extends BaseRepository<Suggestion> {
  constructor() {
    super('suggestions');
  }

  async findByCircleId(circleId: string, status?: SuggestionStatus): Promise<Suggestion[]> {
    return this.getAll(s => {
      if (s.circleId !== circleId) return false;
      if (status && s.status !== status) return false;
      return true;
    });
  }
}

export const suggestionRepo = new SuggestionRepository();
