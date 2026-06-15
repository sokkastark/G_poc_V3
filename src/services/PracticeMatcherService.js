// PracticeMatcherService.js - Handles matching of ENS practice names against approved AI Accounts lists

export class PracticeMatcherService {
  /**
   * Matches a list of ENS records against an AI Accounts list.
   * @param {Array} ensRecords - Raw parsed ENS records
   * @param {Array} aiAccounts - Raw parsed AI Accounts
   * @returns {Object} { matched, unmatched, inactive, summary }
   */
  static match(ensRecords, aiAccounts) {
    if (!ensRecords) return { matched: [], unmatched: [], inactive: [] };
    if (!aiAccounts || aiAccounts.length === 0) {
      return {
        matched: [],
        unmatched: ensRecords.map(r => ({ ...r, matchReason: 'No AI Accounts list provided' })),
        inactive: []
      };
    }

    const matched = [];
    const unmatched = [];
    const inactive = [];
    const unmatchedPractices = new Set();

    // Index AI Accounts by normalized Account Name for fast lookup
    const accountsMap = new Map();
    aiAccounts.forEach(account => {
      let name = '';
      for (const k of Object.keys(account)) {
        const normK = k.toString().toLowerCase().replace(/[\s_-]/g, '');
        if (normK === 'accountname' || normK === 'practicename' || normK === 'name' || normK === 'practice') {
          name = account[k] !== undefined ? account[k].toString().trim().toLowerCase() : '';
          break;
        }
      }
      if (name) {
        accountsMap.set(name, account);
      }
    });

    ensRecords.forEach(record => {
      let practiceName = '';
      for (const k of Object.keys(record)) {
        const normK = k.toString().toLowerCase().replace(/[\s_-]/g, '');
        if (normK === 'practicename' || normK === 'facilityname' || normK === 'practice' || normK === 'facility' || normK === 'organization') {
          practiceName = record[k] !== undefined ? record[k].toString().trim() : '';
          break;
        }
      }
      
      const normalizedPractice = practiceName.toLowerCase();

      if (!normalizedPractice) {
        unmatched.push({ ...record, matchReason: 'Missing Practice Name in ENS record' });
        return;
      }

      if (accountsMap.has(normalizedPractice)) {
        const account = accountsMap.get(normalizedPractice);
        
        let status = 'active';
        for (const k of Object.keys(account)) {
          if (k.toString().toLowerCase().trim() === 'status') {
            status = account[k] !== undefined ? account[k].toString().trim().toLowerCase() : 'active';
            break;
          }
        }

        if (status === 'active') {
          matched.push({
            ...record,
            practiceMatch: practiceName,
            accountStatus: 'Active'
          });
        } else {
          inactive.push({
            ...record,
            practiceMatch: practiceName,
            accountStatus: 'Inactive'
          });
        }
      } else {
        unmatchedPractices.add(practiceName);
        unmatched.push({
          ...record,
          practiceMatch: null,
          matchReason: `Practice "${practiceName}" not in approved list`
        });
      }
    });

    return {
      matched,
      unmatched,
      inactive,
      unmatchedPractices: Array.from(unmatchedPractices)
    };
  }
}

export default PracticeMatcherService;

