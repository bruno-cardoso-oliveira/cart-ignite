import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart] // updatedCart é um novo array com os valores de cart, assim podendo ser manipulado sem quebrar a imutabilidade
      const productExists = updatedCart.find(product => product.id === productId) // verifica se o id do produto é igual o id que foi recebido na função | se for igual o produto já existe dentro do carrinho

      const stock = await api.get(`/stock/${productId}`) // busca na api o estoque do produto atravez do id

      const stockAmount = stock.data.amount // coleta o quantidade em estoque 
      const currentAmount = productExists ? productExists.amount : 0 // se o produto existe ele pega o valor do amount, caso não ele retorno 0 para o currenteAmount
      const amount = currentAmount + 1 // pega o currentAmount que pode ser 0 ou outro valor e soma 1

      if (amount > stockAmount) {  // se a quantidade (amount) for maior do que o estoque, ele retorna um erro e finaliza atravez do return, se não ele continua executando os demais if's
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) { // se o produto existe dentro do carrinho ele atualiza o valor do amount
        productExists.amount = amount;
      } else { // se o produto não existe dentro do carinho ele adiciona esse novo produto dentro do carrinho
        const product = await api.get(`/products/${productId}`) // pega o produto dentro da api atravez do id

        const newProduct = { // cria uma nova constante com o novo produto, coletando todos os demais dados do produto (.data) e adiciona o amount como 1
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct); // dando um .push, ele puxa esse novo produto para a lista de array, nesse caso pode ser utilizado sem quebrar a imutabilidade pois lá no início foi criado uma nova varável assumindo os valores existentes do array
      }

      setCart(updatedCart) // usa a função do state para atualizar o estado do carrinho
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) // salvou no localStorage o novo valor

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 

      const updatedCart = [...cart];
      const productExists =  updatedCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
