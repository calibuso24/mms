import { useState, useEffect } from 'react';
import { materialApi, categoryApi } from '../shared/api/client.js';
import '../shared/styles/masterlist.css';

interface Material {
  material_id: string;
  product_code: string;
  product_name: string;
  category_name: string;
  uom_name: string;
  status_name: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category_id: '',
  });

  useEffect(() => {
    loadMaterials();
    loadCategories();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        search: search || undefined,
        category_id: selectedCategory ? parseInt(selectedCategory) : undefined,
      };
      const data = await materialApi.list(20, 0, filters);
      setMaterials(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryApi.list(100);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMaterials();
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await materialApi.create({
        ...formData,
        category_id: parseInt(formData.category_id),
        stock_uom_id: 1,
        status_id: 1,
      });
      setFormData({ product_code: '', product_name: '', category_id: '' });
      setShowForm(false);
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to create material');
    }
  };

  return (
    <div className="masterlist-container">
      <div className="masterlist-header">
        <h2>Materials Catalog</h2>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Material'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="masterlist-form" onSubmit={handleCreateMaterial}>
          <div className="form-row">
            <div className="form-group">
              <label>Product Code</label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) =>
                  setFormData({ ...formData, product_code: e.target.value })
                }
                placeholder="Enter product code"
                required
              />
            </div>
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) =>
                  setFormData({ ...formData, product_name: e.target.value })
                }
                placeholder="Enter product name"
                required
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
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
            <button type="submit" className="btn-success">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="masterlist-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <select value={selectedCategory} onChange={handleCategoryChange}>
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.category_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="empty-state">No materials found</div>
      ) : (
        <table className="masterlist-table">
          <thead>
            <tr>
              <th>Product Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>UOM</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.material_id}>
                <td>{material.product_code}</td>
                <td>{material.product_name}</td>
                <td>{material.category_name}</td>
                <td>{material.uom_name}</td>
                <td>
                  <span className="status-badge">{material.status_name}</span>
                </td>
                <td>
                  <button className="btn-small">Edit</button>
                  <button className="btn-small btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
