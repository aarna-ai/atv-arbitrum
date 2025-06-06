// SPDX-License-Identifier: Unlicensed

pragma solidity ^0.8.0;

// Reference: https://github.com/cryptofinlabs/cryptofin-solidity/blob/master/contracts/array-utils/AddressArrayUtils.sol
library ArrayUtils {
  /**
   * Deletes address at index and fills the spot with the last address.
   * Order is preserved.
   */
  // solhint-disable-next-line var-name-mixedcase
  function sPopAddress(address[] storage A, uint index) internal {
    uint length = A.length;
    if (index >= length) {
      revert("Error: index out of bounds");
    }

    for (uint i = index; i < length - 1; i++) {
      A[i] = A[i + 1];
    }
    A.pop();
  }

  // solhint-disable-next-line var-name-mixedcase
  function sPopUint256(uint[] storage A, uint index) internal {
    uint length = A.length;
    if (index >= length) {
      revert("Error: index out of bounds");
    }

    for (uint i = index; i < length - 1; i++) {
      A[i] = A[i + 1];
    }
    A.pop();
  }

  // solhint-disable-next-line var-name-mixedcase
  function sumOfMArrays(
    uint[] memory A,
    uint[] memory B
  ) internal pure returns (uint[] memory sum) {
    sum = new uint[](A.length);
    for (uint i = 0; i < A.length; i++) {
      sum[i] = A[i] + B[i];
    }
    return sum;
  }

  /**
   * Finds the index of the first occurrence of the given element.
   * @param A The input array to search
   * @param a The value to find
   * @return Returns (index and isIn) for the first occurrence starting from index 0
   */
  function indexOf(address[] memory A, address a) internal pure returns (uint, bool) {
    uint length = A.length;
    for (uint i = 0; i < length; i++) {
      if (A[i] == a) {
        return (i, true);
      }
    }
    return (type(uint).max, false);
  }

  /**
   * Returns true if the value is present in the list. Uses indexOf internally.
   * @param A The input array to search
   * @param a The value to find
   * @return Returns isIn for the first occurrence starting from index 0
   */
  function contains(address[] memory A, address a) internal pure returns (bool) {
    (, bool isIn) = indexOf(A, a);
    return isIn;
  }

  /**
   * Returns true if there are 2 elements that are the same in an array
   * @param A The input array to search
   * @return Returns boolean for the first occurrence of a duplicate
   */
  function hasDuplicate(address[] memory A) internal pure returns (bool) {
    require(A.length > 0, "A is empty");

    for (uint i = 0; i < A.length - 1; i++) {
      address current = A[i];
      for (uint j = i + 1; j < A.length; j++) {
        if (current == A[j]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @param A The input array to search
   * @param a The address to remove
   * @return Returns the array with the object removed.
   */
  function remove(
    address[] memory A,
    address a
  ) internal pure returns (address[] memory) {
    (uint index, bool isIn) = indexOf(A, a);
    if (!isIn) {
      revert("Address not in array.");
    } else {
      (address[] memory _A, ) = pop(A, index);
      return _A;
    }
  }

  /**
   * @param A The input array to search
   * @param a The address to remove
   */
  function removeStorage(address[] storage A, address a) internal {
    (uint index, bool isIn) = indexOf(A, a);
    if (!isIn) {
      revert("Address not in array.");
    } else {
      uint lastIndex = A.length - 1; // If the array would be empty, the previous line would throw, so no underflow here
      if (index != lastIndex) {
        A[index] = A[lastIndex];
      }
      A.pop();
    }
  }

  /**
   * Removes specified index from array
   * @param A The input array to search
   * @param index The index to remove
   * @return Returns the new array and the removed entry
   */
  function pop(
    address[] memory A,
    uint index
  ) internal pure returns (address[] memory, address) {
    uint length = A.length;
    require(index < A.length, "Index must be < A length");
    address[] memory newAddresses = new address[](length - 1);
    for (uint i = 0; i < index; i++) {
      newAddresses[i] = A[i];
    }
    for (uint j = index + 1; j < length; j++) {
      newAddresses[j - 1] = A[j];
    }
    return (newAddresses, A[index]);
  }

  /**
   * Returns the combination of the two arrays
   * @param A The first array
   * @param B The second array
   * @return Returns A extended by B
   */
  function extend(
    address[] memory A,
    address[] memory B
  ) internal pure returns (address[] memory) {
    uint aLength = A.length;
    uint bLength = B.length;
    address[] memory newAddresses = new address[](aLength + bLength);
    for (uint i = 0; i < aLength; i++) {
      newAddresses[i] = A[i];
    }
    for (uint j = 0; j < bLength; j++) {
      newAddresses[aLength + j] = B[j];
    }
    return newAddresses;
  }

  /**
   * Validate that address and uint array lengths match. Validate address array is not empty
   * and contains no duplicate elements.
   *
   * @param A         Array of addresses
   * @param B         Array of uint
   */
  function validatePairsWithArray(address[] memory A, uint[] memory B) internal pure {
    require(A.length == B.length, "Array length mismatch");
    _validateLengthAndUniqueness(A);
  }

  /**
   * Validate that address and bool array lengths match. Validate address array is not empty
   * and contains no duplicate elements.
   *
   * @param A         Array of addresses
   * @param B         Array of bool
   */
  function validatePairsWithArray(address[] memory A, bool[] memory B) internal pure {
    require(A.length == B.length, "Array length mismatch");
    _validateLengthAndUniqueness(A);
  }

  /**
   * Validate that address and string array lengths match. Validate address array is not empty
   * and contains no duplicate elements.
   *
   * @param A         Array of addresses
   * @param B         Array of strings
   */
  function validatePairsWithArray(address[] memory A, string[] memory B) internal pure {
    require(A.length == B.length, "Array length mismatch");
    _validateLengthAndUniqueness(A);
  }

  /**
   * Validate that address array lengths match, and calling address array are not empty
   * and contain no duplicate elements.
   *
   * @param A         Array of addresses
   * @param B         Array of addresses
   */
  function validatePairsWithArray(
    address[] memory A,
    address[] memory B
  ) internal pure {
    require(A.length == B.length, "Array length mismatch");
    _validateLengthAndUniqueness(A);
  }

  /**
   * Validate that address and bytes array lengths match. Validate address array is not empty
   * and contains no duplicate elements.
   *
   * @param A         Array of addresses
   * @param B         Array of bytes
   */
  function validatePairsWithArray(address[] memory A, bytes[] memory B) internal pure {
    require(A.length == B.length, "Array length mismatch");
    _validateLengthAndUniqueness(A);
  }

  /**
   * Validate address array is not empty and contains no duplicate elements.
   *
   * @param A          Array of addresses
   */
  function _validateLengthAndUniqueness(address[] memory A) internal pure {
    require(A.length > 0, "Array length must be > 0");
    require(!hasDuplicate(A), "Cannot duplicate addresses");
  }
}
