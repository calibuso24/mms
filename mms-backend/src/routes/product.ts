import { Router } from 'express';
import { CategoryController } from '../controllers/category.js';
import { BrandController } from '../controllers/brand.js';
import { UnitOfMeasureController } from '../controllers/unitOfMeasure.js';
import { SubCategoryController } from '../controllers/subCategory.js';
import { MaterialController } from '../controllers/material.js';

const router = Router();

// Initialize controllers
const categoryController = new CategoryController();
const brandController = new BrandController();
const uomController = new UnitOfMeasureController();
const subCategoryController = new SubCategoryController();
const materialController = new MaterialController();

// Categories
router.get('/categories', (req, res, next) => categoryController.listCategories(req, res, next));
router.get('/categories/:id', (req, res, next) =>
  categoryController.getCategory(req, res, next)
);
router.post('/categories', (req, res, next) =>
  categoryController.createCategory(req, res, next)
);
router.put('/categories/:id', (req, res, next) =>
  categoryController.updateCategory(req, res, next)
);
router.delete('/categories/:id', (req, res, next) =>
  categoryController.deleteCategory(req, res, next)
);

// Brands
router.get('/brands', (req, res, next) => brandController.listBrands(req, res, next));
router.get('/brands/:id', (req, res, next) => brandController.getBrand(req, res, next));
router.post('/brands', (req, res, next) => brandController.createBrand(req, res, next));
router.put('/brands/:id', (req, res, next) => brandController.updateBrand(req, res, next));
router.delete('/brands/:id', (req, res, next) =>
  brandController.deleteBrand(req, res, next)
);

// Units of Measure
router.get('/uom', (req, res, next) =>
  uomController.listUnitsOfMeasure(req, res, next)
);
router.get('/uom/:id', (req, res, next) =>
  uomController.getUnitOfMeasure(req, res, next)
);
router.post('/uom', (req, res, next) =>
  uomController.createUnitOfMeasure(req, res, next)
);
router.put('/uom/:id', (req, res, next) =>
  uomController.updateUnitOfMeasure(req, res, next)
);
router.delete('/uom/:id', (req, res, next) =>
  uomController.deleteUnitOfMeasure(req, res, next)
);

// Sub-categories
router.get('/subcategories', (req, res, next) =>
  subCategoryController.listSubCategories(req, res, next)
);
router.get('/subcategories/:id', (req, res, next) =>
  subCategoryController.getSubCategory(req, res, next)
);
router.post('/subcategories', (req, res, next) =>
  subCategoryController.createSubCategory(req, res, next)
);
router.put('/subcategories/:id', (req, res, next) =>
  subCategoryController.updateSubCategory(req, res, next)
);
router.delete('/subcategories/:id', (req, res, next) =>
  subCategoryController.deleteSubCategory(req, res, next)
);

// Materials
router.get('/materials', (req, res, next) =>
  materialController.listMaterials(req, res, next)
);
router.get('/materials/:id', (req, res, next) =>
  materialController.getMaterial(req, res, next)
);
router.post('/materials', (req, res, next) =>
  materialController.createMaterial(req, res, next)
);
router.put('/materials/:id', (req, res, next) =>
  materialController.updateMaterial(req, res, next)
);
router.delete('/materials/:id', (req, res, next) =>
  materialController.deleteMaterial(req, res, next)
);

export default router;
