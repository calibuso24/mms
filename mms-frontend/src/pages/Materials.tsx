import { useState, useEffect } from 'react';
import { materialApi, categoryApi, subCategoryApi, brandApi, uomApi, lookupApi } from '../shared/api/client.js';
import '../shared/styles/masterlist.css';

interface Material {
  material_id: string;
  product_code: string;
  product_name: string;
  category_name: string;
  sub_category_name: string;
  uom_name: string;
  status_name: string;
}

interface FormData {
  product_code: string;
  product_name: string;
  source_description: string;
  category_id: string;
  sub_category_id: string;
  stock_uom_id: string;
  brand_id: string;
  status_id: string;
  notes: string;
  material_specification: {
    primary_size: string;
    secondary_size: string;
    alternate_size: string;
    thickness_or_gauge: string;
    width: string;
    length: string;
    schedule: string;
    pressure_or_load_rating: string;
  };
  material_option?: {
    material_option_id?: number;
    option_code?: string;
    option_name?: string;
    option_type_id?: string;
    requires_approval?: boolean;
    is_active?: boolean;
    notes?: string;
  };
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [optionTypes, setOptionTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [basicSearch, setBasicSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category_id: '',
    sub_category_id: '',
    status_id: '',
    uom_id: '',
  });
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    product_code: '',
    product_name: '',
    source_description: '',
    category_id: '',
    sub_category_id: '',
    stock_uom_id: '',
    brand_id: '',
    status_id: '',
    notes: '',
    material_specification: {
      primary_size: '',
      secondary_size: '',
      alternate_size: '',
      thickness_or_gauge: '',
      width: '',
      length: '',
      schedule: '',
      pressure_or_load_rating: '',
    },
    material_option: {
      option_code: '',
      option_name: '',
      option_type_id: '',
      requires_approval: true,
      is_active: true,
      notes: '',
    },
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load materials when filters change
  useEffect(() => {
    loadMaterials();
  }, [basicSearch, showAdvancedFilters, advancedFilters]);

  // Load sub-categories for advanced filter when category changes
  useEffect(() => {
    if (advancedFilters.category_id) {
      loadSubCategories(advancedFilters.category_id);
    } else {
      setSubCategories([]);
    }
  }, [advancedFilters.category_id]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, brandsData, uomsData, statusesData, optionTypesData] = await Promise.all([
        categoryApi.list(100),
        brandApi.list(100),
        uomApi.list(100),
        lookupApi.listByType('material_status', 100),
        lookupApi.listByType('material_option_type', 100),
      ]);
      setCategories(categoriesData);
      setBrands(brandsData);
      setUoms(uomsData);
      setStatuses(statusesData);
      setOptionTypes(optionTypesData);
      loadMaterials();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadMaterials = async () => {
    setLoading(true);
    setError('');
    try {
      const filters: any = {};
      if (basicSearch) {
        filters.search = basicSearch;
      }
      if (advancedFilters.category_id) {
        filters.category_id = parseInt(advancedFilters.category_id);
      }
      if (advancedFilters.sub_category_id) {
        filters.sub_category_id = parseInt(advancedFilters.sub_category_id);
      }
      if (advancedFilters.status_id) {
        filters.status_id = parseInt(advancedFilters.status_id);
      }
      if (advancedFilters.uom_id) {
        filters.uom_id = parseInt(advancedFilters.uom_id);
      }

      const data = await materialApi.list(100, 0, filters);
      setMaterials(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const loadSubCategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubCategories([]);
      return;
    }
    try {
      const data = await subCategoryApi.list(parseInt(categoryId), 100);
      setSubCategories(data);
    } catch (err) {
      console.error('Failed to load sub-categories:', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name.startsWith('spec_')) {
      const specField = name.replace('spec_', '');
      setFormData({
        ...formData,
        material_specification: {
          ...formData.material_specification,
          [specField]: value,
        },
      });
    } else if (name.startsWith('option_')) {
      const optionField = name.replace('option_', '');
      const checkedValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      setFormData({
        ...formData,
        material_option: {
          ...formData.material_option,
          [optionField]: checkedValue,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setFormData({ ...formData, category_id: categoryId, sub_category_id: '' });
    loadSubCategories(categoryId);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const submitData: any = {
        ...formData,
        category_id: parseInt(formData.category_id),
        stock_uom_id: parseInt(formData.stock_uom_id),
        status_id: parseInt(formData.status_id),
      };
      if (formData.sub_category_id) {
        submitData.sub_category_id = parseInt(formData.sub_category_id);
      }
      if (formData.brand_id) {
        submitData.brand_id = parseInt(formData.brand_id);
      }

      // Only include specification if at least one field is filled
      if (Object.values(formData.material_specification).some(v => v)) {
        submitData.material_specification = formData.material_specification;
      }

      // Only include option if at least option_code is filled
      if (formData.material_option?.option_code) {
        submitData.material_option = {
          option_code: formData.material_option.option_code,
          option_name: formData.material_option.option_name,
          option_type_id: formData.material_option.option_type_id ? parseInt(formData.material_option.option_type_id) : undefined,
          requires_approval: formData.material_option.requires_approval,
          is_active: formData.material_option.is_active,
          notes: formData.material_option.notes,
        };
      }

      await materialApi.create(submitData);
      resetForm();
      setShowAddForm(false);
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to create material');
    }
  };

  const handleEditMaterial = async (materialId: string) => {
    setEditingMaterialId(materialId);
    try {
      const material = await materialApi.get(parseInt(materialId));
      setFormData({
        product_code: material.product_code,
        product_name: material.product_name,
        source_description: material.source_description || '',
        category_id: material.category_id,
        sub_category_id: material.sub_category_id || '',
        stock_uom_id: material.stock_uom_id,
        brand_id: material.brand_id || '',
        status_id: material.status_id,
        notes: material.notes || '',
        material_specification: material.material_specification || {
          primary_size: '',
          secondary_size: '',
          alternate_size: '',
          thickness_or_gauge: '',
          width: '',
          length: '',
          schedule: '',
          pressure_or_load_rating: '',
        },
        material_option: material.material_options?.[0] ? {
          material_option_id: material.material_options[0].material_option_id,
          option_code: material.material_options[0].option_code,
          option_name: material.material_options[0].option_name,
          option_type_id: material.material_options[0].option_type_id?.toString() || '',
          requires_approval: material.material_options[0].requires_approval ?? true,
          is_active: material.material_options[0].is_active ?? true,
          notes: material.material_options[0].notes || '',
        } : {
          option_code: '',
          option_name: '',
          option_type_id: '',
          requires_approval: true,
          is_active: true,
          notes: '',
        },
      });
      loadSubCategories(material.category_id);
    } catch (err: any) {
      setError(err.message || 'Failed to load material');
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterialId) return;

    setError('');
    try {
      const submitData: any = {
        product_name: formData.product_name,
        source_description: formData.source_description,
        category_id: parseInt(formData.category_id),
        stock_uom_id: parseInt(formData.stock_uom_id),
        status_id: parseInt(formData.status_id),
      };
      if (formData.sub_category_id) {
        submitData.sub_category_id = parseInt(formData.sub_category_id);
      }
      if (formData.brand_id) {
        submitData.brand_id = parseInt(formData.brand_id);
      }
      if (formData.notes) {
        submitData.notes = formData.notes;
      }

      if (Object.values(formData.material_specification).some(v => v)) {
        submitData.material_specification = formData.material_specification;
      }

      // Include material_option if editing or if option_code is filled
      if (formData.material_option?.material_option_id || formData.material_option?.option_code) {
        submitData.material_option = {
          material_option_id: formData.material_option.material_option_id,
          option_code: formData.material_option.option_code,
          option_name: formData.material_option.option_name,
          option_type_id: formData.material_option.option_type_id ? parseInt(formData.material_option.option_type_id) : undefined,
          requires_approval: formData.material_option.requires_approval,
          is_active: formData.material_option.is_active,
          notes: formData.material_option.notes,
        };
      }

      await materialApi.update(parseInt(editingMaterialId), submitData);
      resetForm();
      setEditingMaterialId(null);
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to update material');
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    setError('');
    try {
      await materialApi.delete(parseInt(materialId));
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material');
    }
  };

  const resetForm = () => {
    setFormData({
      product_code: '',
      product_name: '',
      source_description: '',
      category_id: '',
      sub_category_id: '',
      stock_uom_id: '',
      brand_id: '',
      status_id: '',
      notes: '',
      material_specification: {
        primary_size: '',
        secondary_size: '',
        alternate_size: '',
        thickness_or_gauge: '',
        width: '',
        length: '',
        schedule: '',
        pressure_or_load_rating: '',
      },
      material_option: {
        option_code: '',
        option_name: '',
        option_type_id: '',
        requires_approval: true,
        is_active: true,
        notes: '',
      },
    });
    setSubCategories([]);
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
    setEditingMaterialId(null);
  };

  return (
    <div className="masterlist-container">
      <div className="masterlist-header">
        <h2>Materials Catalog</h2>
        <button
          className="btn-primary"
          onClick={() => {
            if (showAddForm || editingMaterialId) {
              handleCancel();
            } else {
              setShowAddForm(true);
            }
          }}
        >
          {showAddForm || editingMaterialId ? 'Cancel' : '+ Add Material'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Add/Edit Form */}
      {(showAddForm || editingMaterialId) && (
        <form className="masterlist-form" onSubmit={editingMaterialId ? handleUpdateMaterial : handleAddMaterial}>
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Product Code *</label>
                <input
                  type="text"
                  name="product_code"
                  value={formData.product_code}
                  onChange={handleFormChange}
                  placeholder="Enter product code"
                  required
                  disabled={!!editingMaterialId}
                />
              </div>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleFormChange}
                  placeholder="Enter product name"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleCategoryChange}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Sub Category</label>
                <select
                  name="sub_category_id"
                  value={formData.sub_category_id}
                  onChange={handleFormChange}
                >
                  <option value="">Select a sub-category</option>
                  {subCategories.map((subCat) => (
                    <option key={subCat.sub_category_id} value={subCat.sub_category_id}>
                      {subCat.sub_category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>UOM (Unit of Measure) *</label>
                <select
                  name="stock_uom_id"
                  value={formData.stock_uom_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select a UOM</option>
                  {uoms.map((uom) => (
                    <option key={uom.uom_id} value={uom.uom_id}>
                      {uom.uom_name} ({uom.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Brand</label>
                <select
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleFormChange}
                >
                  <option value="">Select a brand</option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status *</label>
                <select
                  name="status_id"
                  value={formData.status_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select a status</option>
                  {statuses.map((status) => (
                    <option key={status.look_up_id} value={status.look_up_id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Source Description</label>
                <input
                  type="text"
                  name="source_description"
                  value={formData.source_description}
                  onChange={handleFormChange}
                  placeholder="Enter source description"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Enter notes"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Material Specification Section */}
          <div className="form-section">
            <h3>Material Specification</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Primary Size</label>
                <input
                  type="text"
                  name="spec_primary_size"
                  value={formData.material_specification.primary_size}
                  onChange={handleFormChange}
                  placeholder="e.g., 50mm"
                />
              </div>
              <div className="form-group">
                <label>Secondary Size</label>
                <input
                  type="text"
                  name="spec_secondary_size"
                  value={formData.material_specification.secondary_size}
                  onChange={handleFormChange}
                  placeholder="e.g., 30mm"
                />
              </div>
              <div className="form-group">
                <label>Alternate Size</label>
                <input
                  type="text"
                  name="spec_alternate_size"
                  value={formData.material_specification.alternate_size}
                  onChange={handleFormChange}
                  placeholder="e.g., 40mm"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Thickness/Gauge</label>
                <input
                  type="text"
                  name="spec_thickness_or_gauge"
                  value={formData.material_specification.thickness_or_gauge}
                  onChange={handleFormChange}
                  placeholder="e.g., 2.5mm"
                />
              </div>
              <div className="form-group">
                <label>Width</label>
                <input
                  type="text"
                  name="spec_width"
                  value={formData.material_specification.width}
                  onChange={handleFormChange}
                  placeholder="e.g., 100mm"
                />
              </div>
              <div className="form-group">
                <label>Length</label>
                <input
                  type="text"
                  name="spec_length"
                  value={formData.material_specification.length}
                  onChange={handleFormChange}
                  placeholder="e.g., 1000mm"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Schedule</label>
                <input
                  type="text"
                  name="spec_schedule"
                  value={formData.material_specification.schedule}
                  onChange={handleFormChange}
                  placeholder="e.g., SCH 40"
                />
              </div>
              <div className="form-group">
                <label>Pressure/Load Rating</label>
                <input
                  type="text"
                  name="spec_pressure_or_load_rating"
                  value={formData.material_specification.pressure_or_load_rating}
                  onChange={handleFormChange}
                  placeholder="e.g., 100 PSI"
                />
              </div>
            </div>
          </div>

          {/* Material Option Section - Only in Edit Mode */}
          {editingMaterialId && (
            <div className="form-section">
              <h3>Material Option</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Manage material option for substitutes, assemblies, or other variants.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>Option Code {formData.material_option?.material_option_id && '(Read-only - existing)'}</label>
                  <input
                    type="text"
                    name="option_code"
                    value={formData.material_option?.option_code || ''}
                    onChange={handleFormChange}
                    placeholder="e.g., OPT-001"
                    disabled={!!formData.material_option?.material_option_id}
                  />
                </div>
                <div className="form-group">
                  <label>Option Name</label>
                  <input
                    type="text"
                    name="option_name"
                    value={formData.material_option?.option_name || ''}
                    onChange={handleFormChange}
                    placeholder="e.g., Stainless Steel Variant"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Option Type</label>
                  <select
                    name="option_type_id"
                    value={formData.material_option?.option_type_id || ''}
                    onChange={handleFormChange}
                  >
                    <option value="">Select type</option>
                    {optionTypes.map((type) => (
                      <option key={type.look_up_id} value={type.look_up_id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="option_requires_approval"
                    checked={formData.material_option?.requires_approval ?? true}
                    onChange={handleFormChange}
                    id="requires_approval"
                  />
                  <label htmlFor="requires_approval" style={{ margin: 0 }}>Requires Approval</label>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="option_is_active"
                    checked={formData.material_option?.is_active ?? true}
                    onChange={handleFormChange}
                    id="is_active"
                  />
                  <label htmlFor="is_active" style={{ margin: 0 }}>Is Active</label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Option Notes</label>
                  <textarea
                    name="option_notes"
                    value={formData.material_option?.notes || ''}
                    onChange={handleFormChange}
                    placeholder="Enter notes about this option"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-success">
              {editingMaterialId ? 'Update Material' : 'Save Material'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters Section */}
      <div className="masterlist-filters">
        <form className="search-form">
          <input
            type="text"
            placeholder="Search by code or name..."
            value={basicSearch}
            onChange={(e) => setBasicSearch(e.target.value)}
          />
        </form>

        <button
          className={`btn-filter ${showAdvancedFilters ? 'active' : ''}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          {showAdvancedFilters ? '▼ Advanced Filters' : '▶ Advanced Filters'}
        </button>

        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Category</label>
                <select
                  value={advancedFilters.category_id}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, category_id: e.target.value, sub_category_id: '' })}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Sub Category</label>
                <select
                  value={advancedFilters.sub_category_id}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, sub_category_id: e.target.value })}
                >
                  <option value="">All Sub Categories</option>
                  {advancedFilters.category_id &&
                    subCategories.map((subCat) => (
                      <option key={subCat.sub_category_id} value={subCat.sub_category_id}>
                        {subCat.sub_category_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={advancedFilters.status_id}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, status_id: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  {statuses.map((status) => (
                    <option key={status.look_up_id} value={status.look_up_id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>UOM</label>
                <select
                  value={advancedFilters.uom_id}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, uom_id: e.target.value })}
                >
                  <option value="">All UOMs</option>
                  {uoms.map((uom) => (
                    <option key={uom.uom_id} value={uom.uom_id}>
                      {uom.uom_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Materials Table */}
      {loading ? (
        <div className="loading">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="empty-state">No materials found</div>
      ) : (
        <table className="masterlist-table">
          <thead>
            <tr>
              <th>Product Code</th>
              <th>Category</th>
              <th>Sub Category</th>
              <th>Product Name</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.material_id}>
                <td>{material.product_code}</td>
                <td>{material.category_name}</td>
                <td>{material.sub_category_name || '-'}</td>
                <td>{material.product_name}</td>
                <td>{material.uom_name}</td>
                <td>
                  <span className="status-badge">{material.status_name}</span>
                </td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => {
                      setShowAddForm(false);
                      handleEditMaterial(material.material_id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteMaterial(material.material_id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
