import { NavigationRepository, NavigationItem } from '../repositories/navigation.js';

export class NavigationService {
  private navigationRepository = new NavigationRepository();

  async getMainNavigation(accountId?: number): Promise<NavigationItem[]> {
    return this.navigationRepository.findByContext('MAIN', accountId);
  }

  async getReportsNavigation(accountId?: number): Promise<NavigationItem[]> {
    return this.navigationRepository.findByContext('REPORTS', accountId);
  }

  async getNavigationByContext(context: string, accountId?: number): Promise<NavigationItem[]> {
    return this.navigationRepository.findByContext(context, accountId);
  }

  async getChildren(
    navigationId: number,
    context: string,
    accountId?: number
  ): Promise<NavigationItem[]> {
    return this.navigationRepository.findChildren(navigationId, context, accountId);
  }

  async getReportCatalogSidebar(accountId?: number): Promise<any> {
    return this.navigationRepository.getReportCatalogByCategory(accountId);
  }
}
