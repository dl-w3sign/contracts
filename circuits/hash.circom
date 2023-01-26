pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*This circuit template generates poseidon hash by another poseidon hash and additionaly expects msgSender for security.*/  

template Hash() {
    signal input hash;
    signal input msgSender;
    signal output hashOfInput;

    component poseidon = Poseidon(1);
    poseidon.inputs[0] <== hash;
    hashOfInput <== poseidon.out;
}

component main{public [msgSender]} = Hash();
