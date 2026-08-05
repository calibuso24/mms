import { NextFunction, Request, Response } from 'express';
import {
  SystemSettingCategoryCreateDto,
  SystemSettingCategoryUpdateDto,
  SystemSettingCreateDto,
  SystemSettingUpdateDto,
} from '../modules/system_settings/dtos.js';
import { ValidationError } from '../utils/errors.js';
import { SystemSettingsService } from '../services/systemSettings.js';

export class SystemSettingsController {
  private systemSettingsService = new SystemSettingsService();

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await this.systemSettingsService.listCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryCode } = req.params;
      if (!categoryCode) {
        throw new ValidationError('Category code is required');
      }

      const category = await this.systemSettingsService.getCategory(categoryCode);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async getCategorySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryCode } = req.params;
      if (!categoryCode) {
        throw new ValidationError('Category code is required');
      }

      const settings = await this.systemSettingsService.getCategorySettings(categoryCode);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  // Public - used by unauthenticated pages (login) to fetch branding
  async getPublicBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await this.systemSettingsService.getCategorySettings('branding');
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: SystemSettingCategoryCreateDto = req.body;
      const category = await this.systemSettingsService.createCategory(dto, req.accountId);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = Number(req.params.id);
      if (Number.isNaN(categoryId)) {
        throw new ValidationError('Invalid category ID');
      }

      const dto: SystemSettingCategoryUpdateDto = req.body;
      const category = await this.systemSettingsService.updateCategory(categoryId, dto, req.accountId);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = Number(req.params.id);
      if (Number.isNaN(categoryId)) {
        throw new ValidationError('Invalid category ID');
      }

      await this.systemSettingsService.deleteCategory(categoryId, req.accountId);
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryCode } = req.params;
      if (!categoryCode) {
        throw new ValidationError('Category code is required');
      }

      const dto: SystemSettingCreateDto = req.body;
      const setting = await this.systemSettingsService.createSetting(categoryCode, dto, req.accountId);
      res.status(201).json(setting);
    } catch (error) {
      next(error);
    }
  }

  async updateSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const settingId = Number(req.params.id);
      if (Number.isNaN(settingId)) {
        throw new ValidationError('Invalid setting ID');
      }

      const dto: SystemSettingUpdateDto = req.body;
      const setting = await this.systemSettingsService.updateSetting(settingId, dto, req.accountId);
      res.json(setting);
    } catch (error) {
      next(error);
    }
  }

  async deleteSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const settingId = Number(req.params.id);
      if (Number.isNaN(settingId)) {
        throw new ValidationError('Invalid setting ID');
      }

      await this.systemSettingsService.deleteSetting(settingId, req.accountId);
      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async saveCategorySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryCode } = req.params;
      const settings = Array.isArray(req.body?.settings) ? req.body.settings : [];

      if (!categoryCode) {
        throw new ValidationError('Category code is required');
      }

      const saved = await this.systemSettingsService.saveCategorySettings(categoryCode, settings, req.accountId);
      res.json(saved);
    } catch (error) {
      next(error);
    }
  }

  async resetCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryCode } = req.params;
      if (!categoryCode) {
        throw new ValidationError('Category code is required');
      }

      const resetSettings = await this.systemSettingsService.resetCategory(categoryCode, req.accountId);
      res.json(resetSettings);
    } catch (error) {
      next(error);
    }
  }
}
