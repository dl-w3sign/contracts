pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*This circuit template generates poseidon hash by another poseidon hash and msgSender as appendix.*/  

template Hash() {
    signal input hash;
    signal input msgSender;
    signal output hashOfHashAndMsgSender;

    component poseidon = Poseidon(1);
    poseidon.inputs[0] <== hash;
    hashOfHashAndMsgSender <== poseidon.out;
}

component main{public [msgSender]} = Hash();
